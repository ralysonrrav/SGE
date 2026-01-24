
-- 1. Função auxiliar para quebrar a recursão de RLS (Security Definer ignora RLS interno)
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

-- 2. Tabela de Catálogo Mestre
create table if not exists predefined_editais (
  id uuid primary key default gen_random_uuid(), -- Mudança para UUID para melhor prática
  name text not null,
  organization text not null,
  exam_date text,
  subjects jsonb not null default '[]'::jsonb,
  last_updated timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- 3. Habilitar RLS
alter table predefined_editais enable row level security;

-- 4. Políticas de Segurança Corrigidas (Usando a função is_admin)
drop policy if exists "Qualquer um pode ver o catálogo" on predefined_editais;
create policy "Qualquer um pode ver o catálogo" on predefined_editais 
for select using (auth.role() = 'authenticated');

drop policy if exists "Admins gerenciam o catálogo" on predefined_editais;
create policy "Admins gerenciam o catálogo" on predefined_editais 
for all using (
  public.is_admin()
);

-- 5. Garantir que a tabela subjects esteja correta
alter table subjects add column if not exists topics jsonb default '[]'::jsonb;
alter table subjects add column if not exists color text;
