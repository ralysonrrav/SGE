
-- 1. ADIÇÃO DE COLUNAS AO PERFIL (Caso não existam)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS exam_date TEXT,
ADD COLUMN IF NOT EXISTS weekly_goal INTEGER DEFAULT 20;

-- 2. PERMISSÃO DE ATUALIZAÇÃO (RLS)
-- Permite que o usuário logado atualize apenas o seu próprio perfil
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. GARANTIR PERMISSÃO PARA ADMINISTRADORES
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON public.profiles;
CREATE POLICY "Admins podem atualizar qualquer perfil" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'administrator')
  )
);
