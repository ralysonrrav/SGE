
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BrainCircuit, CheckCircle2, Target, Trophy, Clock, AlertCircle, 
  Loader2, RefreshCw, GripVertical, Wand2, Zap, ShieldCheck, 
  Settings2, Trash2, Plus, Info, AlertTriangle, Undo2, Database,
  ArrowLeftRight, X, MousePointer2, ShieldCheck as SessionShield
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
  const [configSubjects, setConfigSubjects] = useState<CycleSubject[]>([]);
  const [disciplinasPorCiclo, setDisciplinasPorCiclo] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(4); 
  const [numCiclos, setNumCiclos] = useState(4); 
  const [activeCycles, setActiveCycles] = useState<Ciclo[]>([]);
  const [materiasConcluidasIds, setMateriasConcluidasIds] = useState<string[]>([]);
  const [metaAtual, setMetaAtual] = useState(1);
  const [metasConcluidas, setMetasConcluidas] = useState(0);

  // Estados de Edição Manual
  const [swapSource, setSwapSource] = useState<{ cycleId: number, instanceId: string } | null>(null);
  const [showAddSubjectToCycle, setShowAddSubjectToCycle] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [nivel, setNivel] = useState<NivelConhecimento>(NivelConhecimento.INTERMEDIARIO);
  const [peso, setPeso] = useState<PesoDisciplina>(PesoDisciplina.NORMAL);

  // Efeito de Sincronização e Isolamento: Limpa estados se o ciclo mudar ou o usuário mudar
  useEffect(() => {
    if (cycle && cycle.user_id === user.id) {
      const raw = cycle as any;
      setActiveCycles(Array.isArray(raw.schedule) ? raw.schedule : (raw.schedule?.cycles || []));
      setMateriasConcluidasIds(raw.materias_concluidas_ids || []);
      setConfigSubjects(raw.config_disciplinas || []);
      setNumCiclos(raw.num_ciclos || 4);
      setDisciplinasPorCiclo(raw.disciplinas_por_ciclo || 3);
      setHoursPerDay(raw.hours_per_day || 4);
      setMetaAtual(raw.meta_atual || 1);
      setMetasConcluidas(raw.metas_concluidas || 0);
    } else {
      // RESET TOTAL se o ciclo não pertencer ao usuário logado ou for nulo
      setActiveCycles([]);
      setMateriasConcluidasIds([]);
      setConfigSubjects([]);
      setNumCiclos(4);
      setDisciplinasPorCiclo(3);
      setHoursPerDay(4);
      setMetaAtual(1);
      setMetasConcluidas(0);
    }
  }, [cycle?.id, user.id]); // user.id é a âncora de segurança

  const activePhaseId = useMemo(() => {
    if (!activeCycles.length) return 1;
    for (const ciclo of activeCycles) {
      const isCicloComplete = ciclo.materias.length > 0 && 
        ciclo.materias.every(m => m.instanceId && materiasConcluidasIds.includes(m.instanceId));
      if (!isCicloComplete) return ciclo.id;
    }
    return activeCycles.length;
  }, [materiasConcluidasIds, activeCycles]);

  const persistChanges = async (updates: any) => {
    if (!supabase || user.role === 'visitor') return;
    setIsSaving(true);
    try {
      const nextMateriasIds = updates.materias_concluidas_ids !== undefined ? updates.materias_concluidas_ids : materiasConcluidasIds;
      const nextMetaAtual = updates.meta_atual !== undefined ? updates.meta_atual : metaAtual;
      const nextMetasConcluidas = updates.metas_concluidas !== undefined ? updates.metas_concluidas : metasConcluidas;
      const nextSchedule = updates.schedule || activeCycles;

      const payload = {
        user_id: user.id, // Vínculo de segurança obrigatório
        board: updates.board || cycle?.board || 'Personalizado',
        exam_date: updates.exam_date || cycle?.examDate || user.examDate || new Date().toISOString().split('T')[0],
        hours_per_day: updates.hours_per_day !== undefined ? updates.hours_per_day : hoursPerDay,
        meta_atual: nextMetaAtual,
        num_ciclos: updates.num_ciclos !== undefined ? updates.num_ciclos : numCiclos,
        metas_concluidas: nextMetasConcluidas,
        disciplinas_por_ciclo: updates.disciplinas_por_ciclo !== undefined ? updates.disciplinas_por_ciclo : disciplinasPorCiclo,
        materias_concluidas_ids: nextMateriasIds,
        config_disciplinas: updates.config_disciplinas || configSubjects,
        schedule: nextSchedule
      };

      // Proteção de UID: eq('user_id', user.id) garante que o update só afete dados do proprietário
      const result = cycle?.id && !String(cycle.id).startsWith('local-')
        ? await supabase.from('study_cycles').update(payload).eq('id', cycle.id).eq('user_id', user.id).select().single()
        : await supabase.from('study_cycles').insert([payload]).select().single();

      if (result.data) setCycle({ ...result.data, id: String(result.data.id) });
    } finally { setIsSaving(false); }
  };

  const toggleMateriaConcluida = async (instanceId: string) => {
    if (isSaving) return;
    const isDone = materiasConcluidasIds.includes(instanceId);
    const nextIds = isDone 
      ? materiasConcluidasIds.filter(id => id !== instanceId)
      : [...materiasConcluidasIds, instanceId];
    setMateriasConcluidasIds(nextIds);
    await persistChanges({ materias_concluidas_ids: nextIds });
  };

  const removeMateriaFromCycle = async (cycleId: number, instanceId: string) => {
    const nextSchedule = activeCycles.map(c => {
      if (c.id === cycleId) {
        const nextMaterias = c.materias.filter(m => m.instanceId !== instanceId);
        return { ...c, materias: nextMaterias, tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0) };
      }
      return c;
    });
    setActiveCycles(nextSchedule);
    await persistChanges({ schedule: nextSchedule });
  };

  const swapMaterias = async (targetCycleId: number, targetInstanceId: string) => {
    if (!swapSource) return;
    const nextSchedule = [...activeCycles];
    let sourceSub: any = null;
    let targetSub: any = null;
    nextSchedule.forEach(c => {
      if (c.id === swapSource.cycleId) sourceSub = c.materias.find(m => m.instanceId === swapSource.instanceId);
      if (c.id === targetCycleId) targetSub = c.materias.find(m => m.instanceId === targetInstanceId);
    });
    if (sourceSub && targetSub) {
      const updatedSchedule = nextSchedule.map(c => {
        let nextMaterias = c.materias.map(m => {
          if (c.id === swapSource.cycleId && m.instanceId === swapSource.instanceId) return { ...targetSub, instanceId: m.instanceId };
          if (c.id === targetCycleId && m.instanceId === targetInstanceId) return { ...sourceSub, instanceId: m.instanceId };
          return m;
        });
        return { ...c, materias: nextMaterias, tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0) };
      });
      setActiveCycles(updatedSchedule);
      await persistChanges({ schedule: updatedSchedule });
    }
    setSwapSource(null);
  };

  const addMateriaToSpecificCycle = async (cycleId: number, subjectId: string) => {
    const baseSub = configSubjects.find(s => String(s.id) === String(subjectId));
    if (!baseSub) return;
    const newInstanceId = `${baseSub.id}-manual-${Date.now()}`;
    const nextSchedule = activeCycles.map(c => {
      if (c.id === cycleId) {
        const nextMaterias = [...c.materias, { ...baseSub, instanceId: newInstanceId }];
        return { ...c, materias: nextMaterias, tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0) };
      }
      return c;
    });
    setActiveCycles(nextSchedule);
    setShowAddSubjectToCycle(null);
    await persistChanges({ schedule: nextSchedule });
  };

  const handleArchiveAndAdvance = async (cicloId: number) => {
    if (cicloId === activeCycles.length) {
      setMetaAtual(prev => prev + 1);
      setMetasConcluidas(prev => prev + 1);
      setMateriasConcluidasIds([]);
      await persistChanges({ meta_atual: metaAtual + 1, metas_concluidas: metasConcluidas + 1, materias_concluidas_ids: [] });
    } else {
      await persistChanges({ materias_concluidas_ids: materiasConcluidasIds });
    }
  };

  const handleGenerate = async () => {
    if (!configSubjects.length) {
      alert("Por favor, adicione disciplinas à base antes de gerar o plano.");
      return;
    }
    const newCycles = gerarCiclos(configSubjects, disciplinasPorCiclo, numCiclos);
    setActiveCycles(newCycles);
    setMetaAtual(1);
    setMetasConcluidas(0);
    setMateriasConcluidasIds([]);
    await persistChanges({
      schedule: newCycles,
      meta_atual: 1,
      metas_concluidas: 0,
      materias_concluidas_ids: [],
      config_disciplinas: configSubjects,
      num_ciclos: numCiclos,
      disciplinas_por_ciclo: disciplinasPorCiclo,
      hours_per_day: hoursPerDay
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* HUD DE COMANDO COM INDICADOR DE SESSÃO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner"><Target size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Meta Estratégica</p>
              <p className="text-2xl font-black text-white"># {metaAtual}</p>
            </div>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-5"><SessionShield size={64}/></div>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner"><Trophy size={24}/></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Conquistas Acumuladas</p>
              <p className="text-2xl font-black text-white">{metasConcluidas}</p>
            </div>
          </div>
          {/* Badge de Sessão Isolada */}
          <div className="absolute top-2 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
             <SessionShield size={8} className="text-emerald-500" />
             <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">Sessão Isolada</span>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-inner"><BrainCircuit size={24}/></div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Ciclo em Execução</p>
              <p className="text-2xl font-black text-white">Ciclo 0{activePhaseId} / {activeCycles.length || '?'}</p>
            </div>
            {isSaving && <RefreshCw size={14} className="text-indigo-500 animate-spin" />}
          </div>
        </div>
      </div>

      {/* PAINEL DE SWAP ATIVO */}
      {swapSource && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
          <div className="bg-indigo-600 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center animate-pulse"><ArrowLeftRight size={16} /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Selecione o destino para trocar de posição</span>
            </div>
            <button onClick={() => setSwapSource(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={16}/></button>
          </div>
        </div>
      )}

      {/* CICLOS EM EXECUÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {activeCycles.length > 0 ? activeCycles.map((ciclo) => {
          const isCurrent = ciclo.id === activePhaseId;
          const isCompleted = ciclo.id < activePhaseId;
          const progressCount = ciclo.materias.filter(m => materiasConcluidasIds.includes(m.instanceId || '')).length;
          const percent = Math.round((progressCount / (ciclo.materias.length || 1)) * 100);

          return (
            <div key={ciclo.id} className={`glass-card overflow-hidden transition-all border-2 ${isCurrent ? 'border-indigo-500 shadow-2xl bg-indigo-500/[0.03]' : isCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 opacity-50'}`}>
              <div className={`p-8 border-b border-white/5 flex items-center justify-between ${isCurrent ? 'bg-indigo-500/10' : 'bg-white/5'}`}>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Ciclo 0{ciclo.id}</p>
                  <h4 className="text-2xl font-black text-white uppercase tracking-tighter">CICLO 0{ciclo.id}</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Clock size={20} className="text-indigo-400 ml-auto mb-1" />
                    <p className="text-[11px] font-black text-slate-400">{Math.floor(ciclo.tempoTotal / 60)}H {ciclo.tempoTotal % 60}M</p>
                  </div>
                  <button onClick={() => setShowAddSubjectToCycle(showAddSubjectToCycle === ciclo.id ? null : ciclo.id)} className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><Plus size={18}/></button>
                </div>
              </div>

              {showAddSubjectToCycle === ciclo.id && (
                <div className="p-6 bg-black/40 border-b border-white/5 animate-in slide-in-from-top-2">
                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Injetar Matéria da Base</p>
                   <div className="flex gap-2">
                     <select className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-indigo-500" onChange={(e) => addMateriaToSpecificCycle(ciclo.id, e.target.value)}>
                       <option value="">Selecione para adicionar...</option>
                       {configSubjects.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                     </select>
                     <button onClick={() => setShowAddSubjectToCycle(null)} className="p-3 text-slate-500"><X size={18}/></button>
                   </div>
                </div>
              )}
              
              <div className="h-1.5 bg-slate-900 w-full relative">
                <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`} style={{ width: `${percent}%` }} />
              </div>

              <div className="p-8 space-y-4">
                {ciclo.materias.map((m, idx) => {
                  const isDone = materiasConcluidasIds.includes(m.instanceId || '');
                  const isSource = swapSource?.instanceId === m.instanceId;

                  return (
                    <div key={m.instanceId || idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isSource ? 'border-indigo-500 bg-indigo-500/10 animate-pulse ring-2 ring-indigo-500/50' : isDone ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-black/40 border-white/5'} hover:border-indigo-500/50 group`}>
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <button 
                          disabled={isSaving} 
                          onClick={() => m.instanceId && toggleMateriaConcluida(m.instanceId)} 
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-transparent border-slate-700 hover:border-indigo-500'}`}
                        >
                          {isDone ? <CheckCircle2 size={16} strokeWidth={3} /> : <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={`text-[12px] font-black uppercase tracking-tight block truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{m.name}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.tempoEstudo} MINUTOS</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => swapSource ? swapMaterias(ciclo.id, m.instanceId) : setSwapSource({ cycleId: ciclo.id, instanceId: m.instanceId })} className={`p-2 rounded-lg ${isSource ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-indigo-400'}`}>
                          <ArrowLeftRight size={14} />
                        </button>
                        <button onClick={() => removeMateriaFromCycle(ciclo.id, m.instanceId)} className="p-2 text-slate-500 hover:text-rose-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                })}

                {isCurrent && (
                  <div className="pt-6">
                    <button 
                      disabled={percent < 100 || isSaving} 
                      onClick={() => handleArchiveAndAdvance(ciclo.id)} 
                      className={`w-full py-6 rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${percent >= 100 ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/30' : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'}`}
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : percent >= 100 ? <><Zap size={18}/> ARQUIVAR CICLO E AVANÇAR</> : <><AlertCircle size={18}/> OBJETIVOS PENDENTES</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="md:col-span-2 py-20 text-center glass-card border-dashed border-white/5 opacity-50">
             <BrainCircuit size={48} className="mx-auto text-slate-700 mb-6" />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Nenhum Ciclo Estratégico Ativo para esta Estação</p>
          </div>
        )}
      </div>

      {/* MATRIZ DE CONFIGURAÇÃO (ABAIXO) */}
      <div className="max-w-4xl mx-auto w-full pt-8">
        <div className="glass-card p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Settings2 size={24} /></div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">MATRIZ DE CONFIGURAÇÃO</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Gestão de Base Estratégica</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Disciplinas/Ciclo</label>
                  <input type="number" value={disciplinasPorCiclo} onChange={e => setDisciplinasPorCiclo(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hrs Líquidas/Dia</label>
                  <input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Ciclos</label>
                  <input type="number" value={numCiclos} onChange={e => setNumCiclos(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none" />
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 space-y-4">
                <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-indigo-500">
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
                }} disabled={!selectedSubjectId || isSaving} className="w-full py-5 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-white/5 active:scale-95 transition-all">
                  <Plus size={18}/> ANEXAR DISCIPLINA
                </button>
              </div>
              <button onClick={handleGenerate} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={22} />}
                REINICIAR PLANO DE CICLOS
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Disciplinas na Base ({configSubjects.length})</p>
              <div className="max-h-[420px] overflow-y-auto custom-scrollbar pr-3 space-y-3">
                {configSubjects.map(s => (
                  <div key={s.id} className="group flex items-center justify-between p-5 bg-white/[0.02] rounded-[1.5rem] border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-indigo-400 uppercase font-black px-2 py-0.5 bg-indigo-500/5 rounded">{s.nivelConhecimento}</span>
                      </div>
                    </div>
                    <button onClick={async () => {
                      const next = configSubjects.filter(ps => ps.id !== s.id);
                      setConfigSubjects(next);
                      await persistChanges({ config_disciplinas: next });
                    }} className="p-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-rose-500/5 rounded-xl"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ciclos;
