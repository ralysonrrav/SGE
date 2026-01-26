
-- SCRIPT DE SINCRONIZAÇÃO DEFINITIVA - TABELA study_cycles
-- Alvo: Tabela study_cycles
-- Finalidade: Adição de colunas estruturais e garantias de integridade.

-- 1. ADIÇÃO DE COLUNA FALTANTE (num_ciclos)
-- Esta coluna controla a profundidade do planejamento estratégico.
ALTER TABLE public.study_cycles 
ADD COLUMN IF NOT EXISTS num_ciclos INTEGER DEFAULT 4;

-- 2. GARANTIA DE VALORES DEFAULT
-- Isso evita erros de 'undefined' ou 'null' no mapeamento do frontend.
ALTER TABLE public.study_cycles 
ALTER COLUMN meta_atual SET DEFAULT 1,
ALTER COLUMN ciclo_atual SET DEFAULT 1,
ALTER COLUMN metas_concluidas SET DEFAULT 0,
ALTER COLUMN hours_per_day SET DEFAULT 4,
ALTER COLUMN disciplinas_por_ciclo SET DEFAULT 3,
ALTER COLUMN materias_concluidas_ids SET DEFAULT '[]'::jsonb,
ALTER COLUMN config_disciplinas SET DEFAULT '[]'::jsonb,
ALTER COLUMN schedule SET DEFAULT '[]'::jsonb;

-- 3. POLÍTICA DE SEGURANÇA (RLS)
-- Garante que apenas o proprietário gerencie seus ciclos.
ALTER TABLE public.study_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios ciclos" ON public.study_cycles;
CREATE POLICY "Usuários gerenciam seus próprios ciclos" 
ON public.study_cycles 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_study_cycles_user_auth ON public.study_cycles(user_id);

COMMENT ON COLUMN public.study_cycles.hours_per_day IS 'Horas líquidas de estudo diário configuradas pelo usuário.';
