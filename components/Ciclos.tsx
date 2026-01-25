
import React, { useState, useMemo } from 'react';
import { 
  BrainCircuit, CheckCircle2, ChevronRight, Settings2, Plus, 
  Trash2, Edit3, Target, Trophy, Clock, AlertCircle, Loader2, Save, DatabaseZap, Zap
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
    
    // Objeto base para garantir que não percamos dados
    const currentData = cycle || {
      board: 'Personalizado',
      examDate: user.examDate || new Date().toISOString(),
      hoursPerDay: 4,
      schedule: [],
      meta_atual: 1,
      ciclo_atual: 1,
      metas_concluidas: 0,
      materias_concluidas_ids: [],
      config_disciplinas: configSubjects,
      disciplinas_por_ciclo: disciplinasPorCiclo
    };

    const updatedCycle = {
      ...currentData,
      ...newState,
      // Se configSubjects ou disciplinasPorCiclo mudaram, usamos o estado atual, senão o que veio no newState
      config_disciplinas: newState.config_disciplinas || configSubjects,
      disciplinas_por_ciclo: newState.disciplinas_por_ciclo || disciplinasPorCiclo,
      user_id: user.id
    } as StudyCycle;

    try {
      if (user.role === 'visitor') {
        setCycle(updatedCycle);
      } else {
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

        const isExisting = cycle?.id && !isNaN(Number(cycle.id));

        let result;
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
          console.log("[Ciclos] Sincronização automática realizada com sucesso.");
        }
      }
    } catch (e: any) {
      console.error("[Ciclos] Erro ao sincronizar:", e);
      alert(`Falha na persistência: ${e.message}`);
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

    let newConfigs;
    if (editingId) {
      newConfigs = configSubjects.map(s => s.id === editingId ? newCycleSubject : s);
      setEditingId(null);
    } else {
      if (configSubjects.find(s => String(s.id) === String(selectedSubjectId))) return;
      newConfigs = [...configSubjects, newCycleSubject];
    }
    
    setConfigSubjects(newConfigs);
    setSelectedSubjectId('');
    // Força o salvamento imediato da nova configuração
    saveCycleState({ config_disciplinas: newConfigs });
  };

  const handleToggleMateria = async (instanceId: string) => {
    if (!cycle) return;
    const currentConcluidas = cycle.materias_concluidas_ids || [];
    const isDone = currentConcluidas.includes(instanceId);
    
    const nextConcluidas = isDone 
      ? currentConcluidas.filter(id => id !== instanceId)
      : [...currentConcluidas, instanceId];
    
    // Persistência imediata no clique
    await saveCycleState({
      materias_concluidas_ids: nextConcluidas
    });
  };

  const handleCompleteCycle = async () => {
    if (!cycle) return;
    const isLastSubCycle = (cycle.ciclo_atual || 1) >= 4;

    // Atualização de estado da fase e das metas
    await saveCycleState({
      ciclo_atual: isLastSubCycle ? 1 : (cycle.ciclo_atual || 1) + 1,
      meta_atual: isLastSubCycle ? (cycle.meta_atual || 1) + 1 : (cycle.meta_atual || 1),
      metas_concluidas: isLastSubCycle ? (cycle.metas_concluidas || 0) + 1 : (cycle.metas_concluidas || 0),
      materias_concluidas_ids: [] // Reseta marcações para a próxima fase
    });
  };

  const activeCicloId = cycle?.ciclo_atual || 1;
  const activeCiclo = ciclosGerados.find(c => c.id === activeCicloId);
  const allMateriaDone = activeCiclo?.materias.length > 0 && activeCiclo?.materias.every(m => m.instanceId && cycle?.materias_concluidas_ids?.includes(m.instanceId));

  const hasAvailableSubjects = subjects && subjects.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER DE STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <Target size={100} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Meta Estratégica</p>
            <p className="text-2xl font-black text-white"># {cycle?.meta_atual || 1}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <Trophy size={100} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fases Concluídas</p>
            <p className="text-2xl font-black text-white">{cycle?.metas_concluidas || 0}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <BrainCircuit size={100} />
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <BrainCircuit size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Estágio do Plano</p>
            <p className="text-2xl font-black text-white">Ciclo {activeCicloId} / 4</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUNA ESQUERDA - CONFIGURAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                <Settings2 size={14} className="text-indigo-400" /> Matriz Operacional
              </h3>
              {isSaving && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full animate-pulse">
                  <Loader2 size={10} className="animate-spin text-indigo-500" />
                  <span className="text-[8px] font-black text-indigo-500 uppercase">Sync</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Carga por Fase</label>
                <input 
                  type="number" 
                  value={disciplinasPorCiclo}
                  onChange={(e) => setDisciplinasPorCiclo(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <label className="text-[9px] font-black text-slate-500 mb-2 block tracking-widest">Adicionar Quest</label>
                {!hasAvailableSubjects ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                      Vá em <span className="text-white">"QUESTS"</span> primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select 
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="">SELECIONE...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <select value={nivel} onChange={(e) => setNivel(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none">
                        {Object.values(NivelConhecimento).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <select value={peso} onChange={(e) => setPeso(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white outline-none">
                        {Object.values(PesoDisciplina).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <button 
                      onClick={handleAddOrUpdateSubject}
                      disabled={!selectedSubjectId || isSaving}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {editingId ? <Edit3 size={14}/> : <Plus size={14}/>} 
                      {editingId ? 'Atualizar' : 'Vincular'}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-2">
                {configSubjects.map(s => (
                  <div key={s.id} className="group flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">{s.name}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-black mt-0.5">{s.nivelConhecimento} • {s.tempoEstudo}M</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(String(s.id)); setSelectedSubjectId(String(s.id)); setNivel(s.nivelConhecimento); setPeso(s.peso); }} className="p-2 hover:bg-white/10 rounded-lg text-amber-500"><Edit3 size={14}/></button>
                      <button onClick={() => {
                        const next = configSubjects.filter(ps => ps.id !== s.id);
                        setConfigSubjects(next);
                        saveCycleState({ config_disciplinas: next });
                      }} className="p-2 hover:bg-white/10 rounded-lg text-rose-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA - VISUALIZAÇÃO DOS CICLOS */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ciclosGerados.map((ciclo) => {
              const isActive = ciclo.id === activeCicloId;
              const isCompleted = ciclo.id < activeCicloId;
              const isLocked = ciclo.id > activeCicloId;
              const progressCount = ciclo.materias.filter(m => cycle?.materias_concluidas_ids?.includes(m.instanceId || '')).length;
              const percent = (progressCount / (ciclo.materias.length || 1)) * 100;

              return (
                <div key={ciclo.id} className={`glass-card overflow-hidden transition-all duration-500 border-2 ${isActive ? 'border-indigo-500 scale-[1.02] shadow-2xl' : 'border-white/5 opacity-60 grayscale-[0.8]'}`}>
                  <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Setor Operacional 0{ciclo.id}</p>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter">FASE {ciclo.id}</h4>
                    </div>
                    <div className="text-right">
                       <Clock size={18} className="text-indigo-400 ml-auto mb-1" />
                       <p className="text-[10px] font-black text-slate-300">{Math.floor(ciclo.tempoTotal / 60)}H {ciclo.tempoTotal % 60}M</p>
                    </div>
                  </div>

                  <div className="h-1.5 bg-slate-900 w-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`} 
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
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isActive ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 group' : ''} ${isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/30 border-white/5'}`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-slate-950 scale-110 shadow-lg' : 'bg-transparent border-slate-700'}`}>
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
                        className={`w-full mt-6 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${allMateriaDone ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 active:scale-[0.98]' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : allMateriaDone ? (
                          <>PRÓXIMA FASE <ChevronRight size={16} /></>
                        ) : (
                          <>PENDÊNCIAS ATIVAS <AlertCircle size={16} /></>
                        )}
                      </button>
                    )}

                    {isLocked && (
                      <div className="mt-4 py-4 text-center border-t border-white/5">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                          PROTOCOLO AGUARDANDO
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {ciclosGerados.length === 0 && (
            <div className="glass-card p-24 flex flex-col items-center justify-center text-center opacity-30">
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center mb-8 border-2 border-dashed border-white/10 animate-pulse">
                 <Zap size={48} className="text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">SISTEMA OFF-LINE</h3>
              <p className="text-slate-500 text-sm max-w-sm font-bold uppercase tracking-widest leading-relaxed">
                Adicione matérias da sua "Quest" para que o motor de ciclos estratégicos possa arquitetar seu plano de estudo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ciclos;
