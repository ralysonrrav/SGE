
-- GARANTIR QUE A TABELA PROFILES TEM TODAS AS COLUNAS NECESSÁRIAS
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Ajustar constraints se necessário
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'student',
ALTER COLUMN status SET DEFAULT 'pending';

-- Garantir que o admin mestre tenha status ativo e role administrator
-- Nota: Substitua pelo ID real se souber, mas aqui usamos o email como referência se possível 
-- ou deixamos para o código lidar com a promoção.
