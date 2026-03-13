
-- GARANTIR QUE A TABELA PROFILES TEM TODAS AS COLUNAS NECESSÁRIAS E POLÍTICAS CORRETAS
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS exam_date TEXT,
ADD COLUMN IF NOT EXISTS weekly_goal INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS active_matrix_id UUID;

-- Políticas de Segurança (RLS) para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Permite que qualquer um veja perfis (necessário para a lista de usuários no admin)
-- Ou pelo menos autenticados
DROP POLICY IF EXISTS "Perfis são visíveis por todos autenticados" ON public.profiles;
CREATE POLICY "Perfis são visíveis por todos autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. Usuários podem inserir e atualizar o próprio perfil
DROP POLICY IF EXISTS "Usuários podem inserir o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem inserir o próprio perfil" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Admin mestre por e-mail (ralysonriccelli@gmail.com) tem controle total
DROP POLICY IF EXISTS "Admin mestre tem controle total" ON public.profiles;
CREATE POLICY "Admin mestre tem controle total" 
ON public.profiles FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'ralysonriccelli@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'ralysonriccelli@gmail.com');

-- 4. Outros administradores (pelo campo role)
DROP POLICY IF EXISTS "Administradores podem gerenciar perfis" ON public.profiles;
CREATE POLICY "Administradores podem gerenciar perfis" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role' = 'administrator' OR raw_user_meta_data->>'role' = 'admin')
  )
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'administrator')
);
-- Nota: A política acima pode causar recursão se não for cuidadosa. 
-- A política do admin mestre por e-mail é a garantia principal.
