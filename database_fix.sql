
-- 1. Garantir que a estrutura de perfis seja sólida e sem recursão
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'administrator'
  );
end;
$$ language plpgsql security definer;

-- 2. Tabela de Matrizes (Predefined Editais)
-- Usando UUID para compatibilidade total com Supabase
create table if not exists public.predefined_editais (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text not null,
  exam_date text,
  subjects jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- 3. Conceder permissões de acesso físico à role de usuários logados
-- Às vezes o RLS está ok, mas o GRANT da tabela foi perdido no reset
grant all on table public.predefined_editais to authenticated;
grant all on table public.predefined_editais to service_role;

-- 4. Habilitar RLS
alter table public.predefined_editais enable row level security;

-- 5. Políticas de Segurança Explícitas (Mais seguras que 'FOR ALL')
drop policy if exists "Leitura pública para logados" on predefined_editais;
create policy "Leitura pública para logados" 
on public.predefined_editais for select 
to authenticated 
using (true);

drop policy if exists "Inserção apenas por admins" on predefined_editais;
create policy "Inserção apenas por admins" 
on public.predefined_editais for insert 
to authenticated 
with check (public.is_admin());

drop policy if exists "Atualização apenas por admins" on predefined_editais;
create policy "Atualização apenas por admins" 
on public.predefined_editais for update 
to authenticated 
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Exclusão apenas por admins" on predefined_editais;
create policy "Exclusão apenas por admins" 
on public.predefined_editais for delete 
to authenticated 
using (public.is_admin());

-- 6. Garantir permissões na tabela de perfis (essencial para is_admin funcionar)
grant select on public.profiles to authenticated;
