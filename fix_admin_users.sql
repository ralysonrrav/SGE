
-- SCRIPT DE CORREÇÃO DE VISIBILIDADE E AUTOMAÇÃO DE PERFIS
-- Este script resolve o problema de usuários pendentes não aparecerem para o administrador.

-- 0. CORREÇÃO DE CONSTRAINTS RESTRITIVAS
-- Remove a constraint antiga que bloqueava o status 'pending'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'blocked', 'pending'));

-- Remove a constraint antiga que bloqueava roles específicos
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('administrator', 'student', 'mentor', 'visitor', 'admin'));

-- 1. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIL
-- Garante que todo novo usuário no Auth tenha um perfil correspondente em public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    new.email,
    'student',
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SINCRONIZAÇÃO DE USUÁRIOS EXISTENTES
-- Insere perfis para usuários que já existem no Auth mas não no Profiles
INSERT INTO public.profiles (id, name, email, role, status)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Usuário'), 
  email, 
  'student', 
  'pending'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. REVISÃO DE POLÍTICAS RLS (EVITAR RECURSÃO)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Todos autenticados podem ver perfis (necessário para o admin e menções)
DROP POLICY IF EXISTS "Perfis são visíveis por todos autenticados" ON public.profiles;
CREATE POLICY "Perfis são visíveis por todos autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Política de Inserção: Usuário pode inserir seu próprio perfil (backup do trigger)
DROP POLICY IF EXISTS "Usuários podem inserir o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem inserir o próprio perfil" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Política de Atualização: Usuário atualiza o seu ou Admin atualiza qualquer um
-- Usamos auth.jwt() para evitar recursão ao verificar o papel do admin
DROP POLICY IF EXISTS "Usuários e Admins podem atualizar perfis" ON public.profiles;
CREATE POLICY "Usuários e Admins podem atualizar perfis" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = id 
  OR auth.jwt() ->> 'email' = 'ralysonriccelli@gmail.com'
  OR (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'administrator')
)
WITH CHECK (
  auth.uid() = id 
  OR auth.jwt() ->> 'email' = 'ralysonriccelli@gmail.com'
  OR (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'administrator')
);

-- Política de Deleção: Apenas Admins
DROP POLICY IF EXISTS "Apenas admins podem deletar perfis" ON public.profiles;
CREATE POLICY "Apenas admins podem deletar perfis" 
ON public.profiles FOR DELETE 
TO authenticated 
USING (
  auth.jwt() ->> 'email' = 'ralysonriccelli@gmail.com'
  OR (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'administrator')
);

-- 4. GARANTIR QUE O ADMIN MESTRE ESTÁ ATIVO
UPDATE public.profiles 
SET role = 'administrator', status = 'active' 
WHERE email = 'ralysonriccelli@gmail.com';
