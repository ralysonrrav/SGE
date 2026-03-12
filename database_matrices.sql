
-- SCRIPT DE CRIAÇÃO DO SISTEMA DE MATRIZES (AMBIENTES)
-- Alvo: Tabelas estruturais
-- Finalidade: Permitir múltiplos ambientes de estudo isolados por usuário.

-- 1. CRIAÇÃO DA TABELA DE MATRIZES
CREATE TABLE IF NOT EXISTS public.matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exam_date DATE,
    weekly_goal INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT false
);

-- 2. ADIÇÃO DE MATRIX_ID NAS TABELAS EXISTENTES
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS matrix_id UUID REFERENCES public.matrices(id) ON DELETE CASCADE;
ALTER TABLE public.study_logs ADD COLUMN IF NOT EXISTS matrix_id UUID REFERENCES public.matrices(id) ON DELETE CASCADE;
ALTER TABLE public.mocks ADD COLUMN IF NOT EXISTS matrix_id UUID REFERENCES public.matrices(id) ON DELETE CASCADE;
ALTER TABLE public.study_cycles ADD COLUMN IF NOT EXISTS matrix_id UUID REFERENCES public.matrices(id) ON DELETE CASCADE;

-- 3. ADIÇÃO DE ACTIVE_MATRIX_ID NO PERFIL
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_matrix_id UUID REFERENCES public.matrices(id) ON DELETE SET NULL;

-- 4. POLÍTICAS DE SEGURANÇA (RLS) PARA MATRIZES
ALTER TABLE public.matrices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam suas próprias matrizes" ON public.matrices;
CREATE POLICY "Usuários gerenciam suas próprias matrizes" 
ON public.matrices 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_matrices_user_id ON public.matrices(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_matrix_id ON public.subjects(matrix_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_matrix_id ON public.study_logs(matrix_id);
CREATE INDEX IF NOT EXISTS idx_mocks_matrix_id ON public.mocks(matrix_id);
CREATE INDEX IF NOT EXISTS idx_study_cycles_matrix_id ON public.study_cycles(matrix_id);

COMMENT ON TABLE public.matrices IS 'Armazena os diferentes ambientes de estudo (matrizes) de cada usuário.';
