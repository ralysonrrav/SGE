
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BrainCircuit, CheckCircle2, Target, Trophy, Clock, AlertCircle, 
  Loader2, RefreshCw, GripVertical, Wand2, Zap, ShieldCheck, 
  Settings2, Trash2, Plus, Info, AlertTriangle, Undo2, Database
} from 'lucide-react';
import { User, Subject, CycleSubject, StudyCycle, NivelConhecimento, PesoDisciplina, Ciclo } from '../types';
import { calcularTempoEstudo, gerarCiclos } from '../services/cycleLogic';
import { supabase } from '../lib/supabase';

interface CiclosProps {
  user: User;
  subjects: Subject[];
  cycle: StudyCycle | null;
  setCycle: (cycle: StudyCycle | null) => void;
}

const Ciclos: React.FC<CiclosProps> = ({ user, subjects, cycle, setCycle }) => {
  // Estados mapeados 1:1 com as colunas reais da tabela 'study_cycles'
  const [configSubjects, setConfigSubjects] = useState<CycleSubject[]>([]);
  const [disciplinasPorCiclo, setDisciplinasPorCiclo] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(4); 
  const [numCiclos, setNumCiclos] = useState(4); 
  const [activeCycles, setActiveCycles] = useState<Ciclo[]>([]);
  const [materiasConcluidasIds, setMateriasConcluidasIds] = useState<string[]>([]);
  const [metaAtual, setMetaAtual] = useState(1);
  const [metasConcluidas, setMetasConcluidas] = useState(0);

  // Estados auxiliares de interface
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [nivel, setNivel] = useState<NivelConhecimento>(NivelConhecimento.INTERMEDIARIO);
  const [peso, setPeso] = useState<PesoDisciplina>(PesoDisciplina.NORMAL);

  // Sincronização: Hidratação do Estado Local a partir do banco
  useEffect(() => {
    if (cycle) {
      const raw = cycle as any;
      setActiveCycles(Array.isArray(raw.schedule) ? raw.schedule : (raw.schedule?.cycles || []));
      setMateriasConcluidasIds(raw.materias_concluidas_ids || []);
      setConfigSubjects(raw.config_disciplinas || []);
      setNumCiclos(raw.num_ciclos || 4);
      setDisciplinasPorCiclo(raw.disciplinas_por_ciclo || 3);
      setHoursPerDay(raw.hours_per_day || 4);
      setMetaAtual(raw.meta_atual || 1);
      setMetasConcluidas(raw.metas_concluidas || 0);
    }
  }, [cycle?.id]);

  // Inteligência de Detecção de Ciclo Ativo
  const activePhaseId = useMemo(() => {
    if (!activeCycles.length) return 1;
    for (const ciclo of activeCycles) {
      const isCicloComplete = ciclo.materias.length > 0 && 
        ciclo.materias.every(m => m.instanceId && materiasConcluidasIds.includes(m.instanceId));
      if (!isCicloComplete) return ciclo.id;
    }
    return activeCycles.length;
  }, [materiasConcluidasIds, activeCycles]);

  // Persistência Atômica com Suporte a Atualização Otimista
  const persistChanges = async (updates: any) => {
    if (!supabase || user.role === 'visitor') return;
    setIsSaving(true);
    
    try {
      const nextMateriasIds = updates.materias_concluidas_ids !== undefined ? updates.materias_concluidas_ids : materiasConcluidasIds;
      const nextMetaAtual = updates.meta_atual !== undefined ? updates.meta_atual : metaAtual;
      const nextMetasConcluidas = updates.metas_concluidas !== undefined ? updates.metas_concluidas : metasConcluidas;

      let nextActivePhaseId = 1;
      if (activeCycles.length > 0) {
        for (const ciclo of activeCycles) {
          const isCicloComplete = ciclo.materias.every(m => m.instanceId && nextMateriasIds.includes(m.instanceId));
          if (!isCicloComplete) {
            nextActivePhaseId = ciclo.id;
            break;
          }
          nextActivePhaseId = ciclo.id;
        }
      }

      const payload = {
        user_id: user.id,
        board: updates.board || cycle?.board || 'Personalizado',
        exam_date: updates.exam_date || cycle?.examDate || user.examDate || new Date().toISOString().split('T')[0],
        hours_per_day: updates.hours_per_day !== undefined ? updates.hours_per_day : hoursPerDay,
        meta_atual: nextMetaAtual,
        ciclo_atual: nextActivePhaseId,
        num_ciclos: updates.num_ciclos !== undefined ? updates.num_ciclos : numCiclos,
        metas_concluidas: nextMetasConcluidas,
        disciplinas_por_ciclo: updates.disciplinas_por_ciclo !== undefined ? updates.disciplinas_por_ciclo : disciplinasPorCiclo,
        materias_concluidas_ids: nextMateriasIds,
        config_disciplinas: updates.config_disciplinas || configSubjects,
        schedule: updates.schedule || activeCycles
      };

      const cycleId = cycle?.id ? String(cycle.id) : null;
      let result;

      if (cycleId && !cycleId.startsWith('local-')) {
        result = await supabase.from('study_cycles').update(payload).eq('id', cycleId).select().single();
      } else {
        result = await supabase.from('study_cycles').insert([payload]).select().single();
      }

      if (result.error) throw result.error;
      if (result.data) {
        setCycle({ ...result.data, id: String(result.data.id) });
      }
    } catch (e: any) {
      console.error("[StudyFlow Persistence] Erro Crítico:", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (configSubjects.length === 0 || isSaving) return;
    const newSchedule = gerarCiclos(configSubjects, disciplinasPorCiclo, numCiclos);
    setActiveCycles(newSchedule);
    setMateriasConcluidasIds([]);
    await persistChanges({ 
      schedule: newSchedule, 
      materias_concluidas_ids: [],
      num_ciclos: numCiclos,
      disciplinas_por_ciclo: disciplinasPorCiclo,
      hours_per_day: hoursPerDay
    });
  };

  const toggleMateria = async (instanceId: string) => {
    const isDone = materiasConcluidasIds.includes(instanceId);
    const nextList = isDone 
      ? materiasConcluidasIds.filter(id => id !== instanceId)
      : [...materiasConcluidasIds, instanceId];
    
    setMateriasConcluidasIds(nextList);
    await persistChanges({ materias_concluidas_ids: nextList });
  };

  const handleArchiveAndAdvance = async (cicloId: number) => {
    const isLastCycle = cicloId === activeCycles.length;

    if (isLastCycle) {
      const nextMeta = metaAtual + 1;
      const nextConcluidas = metasConcluidas + 1;
      
      setMetaAtual(nextMeta);
      setMetasConcluidas(nextConcluidas);
      setMateriasConcluidasIds([]); 

      await persistChanges({ 
        meta_atual: nextMeta, 
        metas_concluidas: nextConcluidas, 
        materias_concluidas_ids: [] 
      });
    } else {
      await persistChanges({ materias_concluidas_ids: materiasConcluidasIds });
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* HUD DE COMANDO ESTRATÉGICO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500 relative group overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner"><Target size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Meta Estratégica</p>
              <p className="text-2xl font-black text-white"># {metaAtual}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-emerald-500 relative group overflow-hidden">
           <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner"><Trophy size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Conquistas Acumuladas</p>
              <p className="text-2xl font-black text-white">{metasConcluidas}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-amber-500 relative group overflow-hidden">
           <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-inner"><BrainCircuit size={24}/></div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Ciclo em Execução</p>
              <p className="text-2xl font-black text-white">Ciclo 0{activePhaseId} / {activeCycles.length || '?'}</p>
            </div>
            {isSaving && <RefreshCw size={14} className="text-indigo-500 animate-spin" />}
          </div>
        </div>
      </div>

      {/* EXECUÇÃO: VISUALIZAÇÃO DOS CICLOS - AGORA LARGURA TOTAL NO TOPO */}
      <div className="space-y-6">
        {activeCycles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
            {activeCycles.map((ciclo) => {
              const isCurrent = ciclo.id === activePhaseId;
              const isCompleted = ciclo.id < activePhaseId;
              const progressCount = ciclo.materias.filter(m => materiasConcluidasIds.includes(m.instanceId || '')).length;
              const percent = Math.round((progressCount / (ciclo.materias.length || 1)) * 100);

              return (
                <div key={ciclo.id} className={`glass-card overflow-hidden transition-all duration-500 border-2 ${isCurrent ? 'border-indigo-500 scale-[1.01] shadow-2xl bg-indigo-500/[0.03]' : isCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 opacity-50'}`}>
                  <div className={`p-8 border-b border-white/5 flex items-center justify-between ${isCurrent ? 'bg-indigo-500/10' : 'bg-white/5'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Ciclo 0{ciclo.id}</p>
                        {isCompleted && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-1">STATUS: COMPLETO</span>}
                        {isCurrent && percent < 100 && <span className="bg-indigo-500/10 text-indigo-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-1">STATUS: ATIVO</span>}
                        {isCurrent && percent === 100 && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-1">AGUARDANDO ARQUIVAMENTO</span>}
                      </div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter">CICLO 0{ciclo.id}</h4>
                    </div>
                    <div className="text-right">
                       <Clock size={20} className="text-indigo-400 ml-auto mb-1" />
                       <p className="text-[11px] font-black text-slate-400">{Math.floor(ciclo.tempoTotal / 60)}H {ciclo.tempoTotal % 60}M</p>
                    </div>
                  </div>
                  
                  <div className="h-1.5 bg-slate-900 w-full relative">
                    <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`} style={{ width: `${percent}%` }} />
                  </div>

                  <div className="p-8 space-y-4 min-h-[220px]">
                    {ciclo.materias.map((m, idx) => {
                      const isDone = materiasConcluidasIds.includes(m.instanceId || '');
                      return (
                        <div key={m.instanceId || idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isDone ? 'bg-emerald-500/5 border-emerald-500/30 shadow-inner' : 'bg-black/40 border-white/5'} hover:border-indigo-500/50 group`}>
                          <div className="flex items-center gap-5 min-w-0 flex-1">
                            <button 
                              disabled={isSaving} 
                              onClick={() => m.instanceId && toggleMateria(m.instanceId)} 
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-transparent border-slate-700 hover:border-indigo-500'}`}
                            >
                              {isDone ? <CheckCircle2 size={16} strokeWidth={3} /> : <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className={`text-[12px] font-black uppercase tracking-tight block truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{m.name}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.tempoEstudo} MINUTOS • {m.nivelConhecimento}</span>
                            </div>
                          </div>
                          {isDone && <Undo2 size={14} className="text-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      );
                    })}

                    {isCurrent && (
                      <div className="pt-6">
                        <button 
                          disabled={percent < 100 || isSaving} 
                          onClick={() => handleArchiveAndAdvance(ciclo.id)} 
                          className={`w-full py-6 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${percent >= 100 ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30 active:scale-95' : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'}`}
                        >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : (
                            percent >= 100 ? <><Zap size={18}/> ARQUIVAR CICLO E AVANÇAR</> : <><AlertCircle size={18}/> OBJETIVOS PENDENTES</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-32 glass-card rounded-[3.5rem] border-dashed border-white/10 opacity-30">
             <div className="w-24 h-24 bg-indigo-500/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/5 animate-pulse">
               <Wand2 size={48} className="text-slate-700" />
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Motor de Estratégia Prontificado</h3>
             <p className="text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] max-w-sm leading-relaxed">Alimente a matriz de configuração abaixo para materializar seu plano de ciclos.</p>
          </div>
        )}
      </div>

      {/* PAINEL TÁTICO - AGORA ABAIXO DOS CICLOS */}
      <div className="max-w-4xl mx-auto w-full pt-8">
        <div className="glass-card p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Settings2 size={24} />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">MATRIZ DE CONFIGURAÇÃO</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Ajuste os parâmetros do seu plano de batalha</p>
              </div>
            </div>
            {cycle && (
              <button onClick={() => setShowDeleteModal(true)} className="p-3 bg-white/5 rounded-2xl text-slate-600 hover:text-rose-500 transition-all hover:rotate-90">
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Disciplinas/Ciclo</label>
                  <input type="number" value={disciplinasPorCiclo} onChange={e => setDisciplinasPorCiclo(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hrs Líquidas/Dia</label>
                  <input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Ciclos</label>
                  <input type="number" value={numCiclos} onChange={e => setNumCiclos(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white focus:border-indigo-500 outline-none transition-all" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <label className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em] mb-2 block">Anexar à Base Estratégica</label>
                <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all">
                  <option value="">SELECIONAR MATÉRIA...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <select value={nivel} onChange={e => setNivel(e.target.value as any)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-slate-300 uppercase outline-none focus:border-indigo-500">
                    {Object.values(NivelConhecimento).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={peso} onChange={e => setPeso(e.target.value as any)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-slate-300 uppercase outline-none focus:border-indigo-500">
                    {Object.values(PesoDisciplina).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <button onClick={async () => {
                  const base = subjects.find(s => String(s.id) === String(selectedSubjectId));
                  if (!base) return;
                  const next = [...configSubjects, { ...base, nivelConhecimento: nivel, peso, tempoEstudo: calcularTempoEstudo(nivel, peso) }];
                  setConfigSubjects(next);
                  setSelectedSubjectId('');
                  await persistChanges({ config_disciplinas: next });
                }} disabled={!selectedSubjectId || isSaving} className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-white/5 active:scale-95 transition-all">
                  <Plus size={18}/> ANEXAR DISCIPLINA
                </button>
              </div>

              {configSubjects.length > 0 && (
                <div className="pt-6">
                  <button onClick={handleGenerate} disabled={isSaving} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 group">
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={22} className="group-hover:rotate-12 transition-transform" />}
                    GERAR NOVO PLANO DE CICLOS
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de Dados do Plano ({configSubjects.length})</p>
                {/* Fixed missing icon import here */}
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><Database size={14} className="text-indigo-400" /></div>
              </div>
              <div className="max-h-[420px] overflow-y-auto custom-scrollbar pr-3 space-y-3">
                {configSubjects.map(s => (
                  <div key={s.id} className="group flex items-center justify-between p-5 bg-white/[0.02] rounded-[1.5rem] border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-indigo-400 uppercase font-black px-2 py-0.5 bg-indigo-500/5 rounded">{s.nivelConhecimento}</span>
                        <span className="text-[8px] text-slate-500 uppercase font-black">{s.tempoEstudo} MINUTOS</span>
                      </div>
                    </div>
                    <button onClick={async () => {
                      const next = configSubjects.filter(ps => ps.id !== s.id);
                      setConfigSubjects(next);
                      await persistChanges({ config_disciplinas: next });
                    }} className="p-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-rose-500/5 rounded-xl hover:bg-rose-500/10"><Trash2 size={16}/></button>
                  </div>
                ))}
                {configSubjects.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                    <Info size={32} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma disciplina na base</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE SEGURANÇA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-3xl animate-in fade-in">
           <div className="glass-card w-full max-w-sm p-12 rounded-[3.5rem] border border-rose-500/20 text-center shadow-[0_0_100px_rgba(244,63,94,0.1)]">
              <div className="w-20 h-20 rounded-[2.5rem] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8 border border-rose-500/20"><AlertTriangle size={44}/></div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">PURGAR PLANO?</h3>
              <p className="text-slate-400 text-xs font-bold uppercase mb-10 leading-relaxed tracking-wide">Esta ação desintegrará seu ciclo atual do banco de dados.</p>
              <div className="flex flex-col gap-4">
                <button onClick={async () => {
                   if (!cycle || user.role === 'visitor') return;
                   setIsSaving(true);
                   try {
                     await supabase.from('study_cycles').delete().eq('id', cycle.id);
                     setCycle(null);
                     setActiveCycles([]);
                     setConfigSubjects([]);
                     setShowDeleteModal(false);
                   } finally { setIsSaving(false); }
                }} className="py-6 rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest transition-all bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-900/20 active:scale-95">
                  CONFIRMAR PURGA
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">ABORTAR COMANDO</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ciclos;
