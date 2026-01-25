
import React, { useState, useMemo } from 'react';
import { 
  BrainCircuit, CheckCircle2, ChevronRight, Settings2, Plus, 
  Trash2, Edit3, Target, Trophy, Clock, AlertCircle, Loader2, Save, DatabaseZap
} from 'lucide-react';
import { User, Subject, CycleSubject, StudyCycle, NivelConhecimento, PesoDisciplina } from '../types';
import { calcularTempoEstudo, gerarCiclos } from '../services/cycleLogic';
import { supabase } from '../lib/supabase';

interface CiclosProps {
  user: User;
  subjects: Subject[];
  cycle: StudyCycle | null;
  setCycle: (cycle: StudyCycle | null) => void;
}

const Ciclos: React.FC<CiclosProps> = ({ user, subjects, cycle, setCycle }) => {
  const [configSubjects, setConfigSubjects] = useState<CycleSubject[]>(cycle?.config_disciplinas || []);
  const [disciplinasPorCiclo, setDisciplinasPorCiclo] = useState(cycle?.disciplinas_por_ciclo || 4);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [nivel, setNivel] = useState<NivelConhecimento>(NivelConhecimento.INICIANTE);
  const [peso, setPeso] = useState<PesoDisciplina>(PesoDisciplina.NORMAL);

  const ciclosGerados = useMemo(() => {
    return gerarCiclos(configSubjects, disciplinasPorCiclo);
  }, [configSubjects, disciplinasPorCiclo]);

  const saveCycleState = async (newState: Partial<StudyCycle>) => {
    if (!supabase) return;
    setIsSaving(true);
    
    // Objeto temporário para o estado local
    const baseCycle = cycle || {
      board: 'Personalizado',
      examDate: user.examDate || new Date().toISOString(),
      hoursPerDay: 4,
      schedule: [],
      meta_atual: 1,
      ciclo_atual: 1,
      metas_concluidas: 0,
      materias_concluidas_ids: [],
    };

    const updatedCycle = {
      ...baseCycle,
      ...newState,
      config_disciplinas: configSubjects,
      disciplinas_por_ciclo: disciplinasPorCiclo,
      user_id: user.id
    } as StudyCycle;

    try {
      if (user.role === 'visitor') {
        setCycle(updatedCycle);
        console.log("[Ciclos] Modo Visitante: Salvo apenas localmente.");
      } else {
        // Mapeamento rigoroso para Snake Case (exatamente como no seu banco)
        const payload = {
          user_id: user.id,
          board: updatedCycle.board,
          exam_date: updatedCycle.examDate,
          hours_per_day: updatedCycle.hoursPerDay,
          meta_atual: updatedCycle.meta_atual,
          ciclo_atual: updatedCycle.ciclo_atual,
          metas_concluidas: updatedCycle.metas_concluidas,
          materias_concluidas_ids: updatedCycle.materias_concluidas_ids || [],
          config_disciplinas: updatedCycle.config_disciplinas || [],
          disciplinas_por_ciclo: updatedCycle.disciplinas_por_ciclo,
          schedule: updatedCycle.schedule || []
        };

        let result;
        // Na sua imagem o ID é int8. Se não tivermos um ID real (não numérico), inserimos.
        const isExisting = cycle?.id && !isNaN(Number(cycle.id));

        if (isExisting) {
          result = await supabase
            .from('study_cycles')
            .update(payload)
            .eq('id', cycle.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from('study_cycles')
            .insert([payload])
            .select()
            .single();
        }

        if (result.error) throw result.error;
        
        if (result.data) {
          setCycle({
            ...updatedCycle,
            id: String(result.data.id)
          });
          console.log("[Ciclos] Persistência realizada com ID:", result.data.id);
        }
      }
    } catch (e: any) {
      console.error("[Ciclos] Falha crítica de sincronização:", e);
      alert(`Erro no Banco de Dados: ${e.message}\n\nCertifique-se de que executou o script SQL para adicionar as novas colunas.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrUpdateSubject = () => {
    const baseSubject = subjects.find(s => String(s.id) === String(selectedSubjectId));
    if (!baseSubject) return;

    const newCycleSubject: CycleSubject = {
      ...baseSubject,
      nivelConhecimento: nivel,
      peso,
      tempoEstudo: calcularTempoEstudo(nivel, peso)
    };

    if (editingId) {
      setConfigSubjects(prev => prev.map(s => s.id === editingId ? newCycleSubject : s));
      setEditingId(null);
    } else {
      if (configSubjects.find(s => String(s.id) === String(selectedSubjectId))) return;
      setConfigSubjects(prev => [...prev, newCycleSubject]);
    }
    setSelectedSubjectId('');
  };

  const handleToggleMateria = (instanceId: string) => {
    if (!cycle) return;
    const currentConcluidas = cycle.materias_concluidas_ids || [];
    const isDone = currentConcluidas.includes(instanceId);
    
    saveCycleState({
      materias_concluidas_ids: isDone 
        ? currentConcluidas.filter(id => id !== instanceId)
        : [...currentConcluidas, instanceId]
    });
  };

  const handleCompleteCycle = () => {
    if (!cycle) return;
    const isLastSubCycle = (cycle.ciclo_atual || 1) >= 4;

    saveCycleState({
      ciclo_atual: isLastSubCycle ? 1 : (cycle.ciclo_atual || 1) + 1,
      meta_atual: isLastSubCycle ? (cycle.meta_atual || 1) + 1 : (cycle.meta_atual || 1),
      metas_concluidas: isLastSubCycle ? (cycle.metas_concluidas || 0) + 1 : (cycle.metas_concluidas || 0),
      materias_concluidas_ids: []
    });
  };

  const activeCicloId = cycle?.ciclo_atual || 1;
  const activeCiclo = ciclosGerados.find(c => c.id === activeCicloId);
  const allMateriaDone = activeCiclo?.materias.length > 0 && activeCiclo?.materias.every(m => m.instanceId && cycle?.materias_concluidas_ids?.includes(m.instanceId));

  const hasAvailableSubjects = subjects && subjects.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Meta Atual</p>
            <p className="text-2xl font-black text-white"># {cycle?.meta_atual || 1}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Concluídas</p>
            <p className="text-2xl font-black text-white">{cycle?.metas_concluidas || 0}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <BrainCircuit size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fase em Curso</p>
            <p className="text-2xl font-black text-white">Ciclo {activeCicloId} / 4</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                <Settings2 size={14} className="text-indigo-400" /> Matriz do Plano
              </h3>
              {cycle?.id && !isNaN(Number(cycle.id)) && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg">
                  <DatabaseZap size={10} className="text-emerald-500" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase">Sincronizado</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Carga Disciplinar por Ciclo</label>
                <input 
                  type="number" 
                  value={disciplinasPorCiclo}
                  onChange={(e) => setDisciplinasPorCiclo(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Nova Ingestão</label>
                {!hasAvailableSubjects ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-relaxed">
                      Nenhuma disciplina ativa.<br/>Adicione em <span className="text-white">"QUESTS"</span> primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select 
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="">SELECIONE UMA DISCIPLINA...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-600 mb-1 block">Experiência</label>
                        <select value={nivel} onChange={(e) => setNivel(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none">
                          {Object.values(NivelConhecimento).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-600 mb-1 block">Peso</label>
                        <select value={peso} onChange={(e) => setPeso(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none">
                          {Object.values(PesoDisciplina).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleAddOrUpdateSubject}
                      disabled={!selectedSubjectId}
                      className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${selectedSubjectId ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      {editingId ? <Edit3 size={14}/> : <Plus size={14}/>} 
                      {editingId ? 'Atualizar Config' : 'Adicionar ao Plano'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-2">
                {configSubjects.map(s => (
                  <div key={s.id} className="group flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">{s.name}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-black mt-0.5">{s.nivelConhecimento} • {s.tempoEstudo}MIN</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(String(s.id)); setSelectedSubjectId(String(s.id)); setNivel(s.nivelConhecimento); setPeso(s.peso); }} className="p-2 hover:bg-white/10 rounded-lg text-amber-500"><Edit3 size={14}/></button>
                      <button onClick={() => setConfigSubjects(prev => prev.filter(ps => ps.id !== s.id))} className="p-2 hover:bg-white/10 rounded-lg text-rose-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
                {configSubjects.length > 0 && (
                  <button 
                    disabled={isSaving}
                    onClick={() => saveCycleState({})} 
                    className="w-full mt-6 py-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSaving ? 'SINCRONIZANDO...' : 'GERAR E SALVAR PLANILHA'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ciclosGerados.map((ciclo) => {
              const isActive = ciclo.id === activeCicloId;
              const isCompleted = ciclo.id < activeCicloId;
              const isLocked = ciclo.id > activeCicloId;
              const progress = ciclo.materias.filter(m => cycle?.materias_concluidas_ids?.includes(m.instanceId || '')).length;
              const percent = (progress / (ciclo.materias.length || 1)) * 100;

              return (
                <div key={ciclo.id} className={`glass-card overflow-hidden transition-all duration-500 border-2 ${isActive ? 'border-indigo-500 scale-[1.02] shadow-2xl shadow-indigo-500/10' : 'border-white/5 opacity-60 grayscale-[0.8]'}`}>
                  <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Status Operacional 0{ciclo.id}</p>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter">FASE {ciclo.id}</h4>
                    </div>
                    <div className="text-right">
                       <Clock size={18} className="text-indigo-400 ml-auto mb-1" />
                       <p className="text-[10px] font-black text-slate-300">{Math.floor(ciclo.tempoTotal / 60)}H {ciclo.tempoTotal % 60}M</p>
                    </div>
                  </div>

                  <div className="h-1.5 bg-slate-900 w-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} 
                      style={{ width: `${isCompleted ? 100 : percent}%` }}
                    />
                  </div>

                  <div className="p-6 space-y-3">
                    {ciclo.materias.map((m, idx) => {
                      const isDone = cycle?.materias_concluidas_ids?.includes(m.instanceId || '') || isCompleted;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => isActive && m.instanceId && handleToggleMateria(m.instanceId)}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isActive ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-white/5' : ''} ${isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/30 border-white/5'}`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-transparent border-slate-700'}`}>
                              {isDone && <CheckCircle2 size={14} strokeWidth={3} />}
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isDone ? 'text-slate-600 line-through' : 'text-slate-100'}`}>{m.name}</span>
                          </div>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg ${isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{m.tempoEstudo}M</span>
                        </div>
                      );
                    })}

                    {isActive && (
                      <button 
                        disabled={!allMateriaDone || isSaving}
                        onClick={handleCompleteCycle}
                        className={`w-full mt-6 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${allMateriaDone ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                      >
                        {allMateriaDone ? (
                          <>FINALIZAR FASE <ChevronRight size={16} /></>
                        ) : (
                          <>QUESTS PENDENTES <AlertCircle size={16} /></>
                        )}
                      </button>
                    )}

                    {isLocked && (
                      <div className="mt-4 py-4 text-center border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                          <CheckCircle2 size={12} className="opacity-20" /> ACESSO RESTRITO
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {ciclosGerados.length === 0 && (
            <div className="glass-card p-24 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center mb-8 border-2 border-dashed border-white/10">
                 <BrainCircuit size={48} className="text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">MOTOR DE CICLOS INATIVO</h3>
              <p className="text-slate-500 text-sm max-w-sm font-bold uppercase tracking-widest leading-relaxed">
                Configure as disciplinas no terminal lateral para gerar sua planilha de ciclos automatizada e persistente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ciclos;
