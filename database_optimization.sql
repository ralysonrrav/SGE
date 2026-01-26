
-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA OTIMIZAR O BANCO
-- Isso permitirá relatórios mais rápidos e buscas indexadas.

ALTER TABLE public.study_cycles 
ADD COLUMN IF NOT EXISTS ciclo_atual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS num_ciclos INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS disciplinas_por_ciclo INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS metas_concluidas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS materias_concluidas_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS config_disciplinas JSONB DEFAULT '[]'::jsonb;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_study_cycles_user_id ON public.study_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_study_cycles_active_phase ON public.study_cycles(ciclo_atual);

COMMENT ON TABLE public.study_cycles IS 'Armazena o plano estratégico de ciclos de estudo dos alunos.';
