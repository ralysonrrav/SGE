
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BrainCircuit, CheckCircle2, ChevronRight, Settings2, Plus, 
  Trash2, Edit3, Target, Trophy, Clock, AlertCircle, Loader2, Save, Undo2, Zap, ShieldX, AlertTriangle, RefreshCw, GripVertical, Move, Wand2
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
  // Estado local para configurações sincronizadas
  const [configSubjects, setConfigSubjects] = useState<CycleSubject[]>([]);
  const [disciplinasPorCiclo, setDisciplinasPorCiclo] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [numCiclos, setNumCiclos] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeCycles, setActiveCycles] = useState<Ciclo[]>([]);
  const [draggedItem, setDraggedItem] = useState<{ cycleId: number, index: number } | null>(null);

  // Estados do Formulário
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [nivel, setNivel] = useState<NivelConhecimento>(NivelConhecimento.INICIANTE);
  const [peso, setPeso] = useState<PesoDisciplina>(PesoDisciplina.NORMAL);

  // Sincronização de entrada (Prop para Estado Local)
  useEffect(() => {
    if (cycle) {
      const raw = cycle as any;
      setActiveCycles(raw.schedule || []);
      setConfigSubjects(raw.config_disciplinas || raw.configDisciplinas || []);
      setNumCiclos(raw.num_ciclos || raw.numCiclos || 4);
      setDisciplinasPorCiclo(raw.disciplinas_por_ciclo || raw.disciplinasPorCiclo || 3);
      setHoursPerDay(raw.hours_per_day || raw.hoursPerDay || 4);
    } else {
      setActiveCycles([]);
      setConfigSubjects([]);
    }
  }, [cycle?.id]);

  const getProgressoIds = (): string[] => {
    if (!cycle) return [];
    return (cycle as any).materias_concluidas_ids || (cycle as any).materiasConcluidasIds || [];
  };

  const calculateActivePhase = (concluidasIds: string[], currentCycles: Ciclo[]): number => {
    if (!currentCycles || currentCycles.length === 0) return 1;
    for (const ciclo of currentCycles) {
      const isCicloComplete = ciclo.materias.length > 0 && 
        ciclo.materias.every(m => m.instanceId && concluidasIds.includes(m.instanceId));
      
      if (!isCicloComplete) return ciclo.id;
    }
    return currentCycles.length > 0 ? currentCycles[currentCycles.length - 1].id : 1;
  };

  // Função Nuclear de Persistência
  const saveCycleState = async (updates: any, updatedSchedule?: Ciclo[]) => {
    if (!supabase) return;
    setIsSaving(true);
    
    try {
      const finalSchedule = updatedSchedule || activeCycles;
      const currentConcluidas = updates.materias_concluidas_ids !== undefined 
        ? updates.materias_concluidas_ids 
        : getProgressoIds();
      
      const nextActivePhase = calculateActivePhase(currentConcluidas, finalSchedule);

      // Payload normalizado para colunas do Postgres (Snake Case)
      const payload = {
        user_id: user.id,
        board: updates.board || cycle?.board || 'Personalizado',
        exam_date: updates.exam_date || updates.examDate || cycle?.examDate || user.examDate || new Date().toISOString().split('T')[0],
        hours_per_day: updates.hours_per_day || updates.hoursPerDay || hoursPerDay,
        num_ciclos: updates.num_ciclos || updates.numCiclos || numCiclos,
        schedule: finalSchedule,
        meta_atual: updates.meta_atual || cycle?.meta_atual || 1,
        ciclo_atual: nextActivePhase,
        metas_concluidas: updates.metas_concluidas || cycle?.metas_concluidas || 0,
        materias_concluidas_ids: currentConcluidas,
        config_disciplinas: updates.config_disciplinas || configSubjects,
        disciplinas_por_ciclo: updates.disciplinas_por_ciclo || updates.disciplinasPorCiclo || disciplinasPorCiclo,
      };

      if (user.role === 'visitor') {
        const localData = { ...payload, id: cycle?.id || 'visitor-cycle' } as any;
        setCycle(localData);
        setActiveCycles(finalSchedule);
      } else {
        let result;
        // CORREÇÃO CRÍTICA: String(id) para evitar crash em IDs numéricos (int8)
        const cycleId = cycle?.id ? String(cycle.id) : null;
        
        if (cycleId && !cycleId.startsWith('local-')) {
          result = await supabase.from('study_cycles').update(payload).eq('id', cycleId).select().single();
        } else {
          result = await supabase.from('study_cycles').insert([payload]).select().single();
        }

        if (result.error) throw result.error;
        
        if (result.data) {
          const syncedData = { ...result.data, id: String(result.data.id) } as any;
          setCycle(syncedData);
          setActiveCycles(syncedData.schedule || []);
        }
      }
    } catch (e: any) {
      console.error("[Ciclos Error]", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateManualCycle = async () => {
    if (configSubjects.length === 0 || isSaving) return;
    
    // Geração local
    const suggestion = gerarCiclos(configSubjects, disciplinasPorCiclo, numCiclos);
    
    // Atualização imediata da UI para feedback de performance
    setActiveCycles(suggestion);
    
    // Persistência forçada
    await saveCycleState({ 
      schedule: suggestion,
      materias_concluidas_ids: [],
      ciclo_atual: 1,
      metas_concluidas: 0
    }, suggestion);
  };

  const handleToggleMateria = async (instanceId: string) => {
    if (!cycle || isSaving) return;
    const currentConcluidas = getProgressoIds();
    const isDone = currentConcluidas.includes(instanceId);
    const nextConcluidas = isDone 
      ? currentConcluidas.filter(id => id !== instanceId)
      : [...currentConcluidas, instanceId];
    
    await saveCycleState({ materias_concluidas_ids: nextConcluidas });
  };

  const deleteMateriaFromCycle = async (cycleId: number, instanceId: string) => {
    if (isSaving) return;
    const updatedCycles = activeCycles.map(c => {
      if (c.id === cycleId) {
        const nextMaterias = c.materias.filter(m => m.instanceId !== instanceId);
        return {
          ...c,
          materias: nextMaterias,
          tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0)
        };
      }
      return c;
    });
    await saveCycleState({ schedule: updatedCycles }, updatedCycles);
  };

  const handleDragStart = (cycleId: number, index: number) => {
    setDraggedItem({ cycleId, index });
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (targetCycleId: number) => {
    if (!draggedItem || isSaving) return;
    const { cycleId: sourceCycleId, index: sourceIndex } = draggedItem;
    if (sourceCycleId === targetCycleId) return;

    const sourceCycle = activeCycles.find(c => c.id === sourceCycleId);
    const targetCycle = activeCycles.find(c => c.id === targetCycleId);
    if (!sourceCycle || !targetCycle) return;

    const subjectToMove = sourceCycle.materias[sourceIndex];
    const updatedCycles = activeCycles.map(c => {
      if (c.id === sourceCycleId) {
        const nextMaterias = sourceCycle.materias.filter((_, i) => i !== sourceIndex);
        return { ...c, materias: nextMaterias, tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0) };
      }
      if (c.id === targetCycleId) {
        const nextMaterias = [...targetCycle.materias, subjectToMove];
        return { ...c, materias: nextMaterias, tempoTotal: nextMaterias.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0) };
      }
      return c;
    });

    setDraggedItem(null);
    await saveCycleState({ schedule: updatedCycles }, updatedCycles);
  };

  const handleDeletePlan = async () => {
    if (!cycle || !supabase || isSaving) return;
    setIsSaving(true);
    try {
      const cycleId = String(cycle.id);
      if (user.role !== 'visitor' && !cycleId.startsWith('local-')) {
        await supabase.from('study_cycles').delete().eq('id', cycleId);
      }
      setCycle(null);
      setActiveCycles([]);
      setConfigSubjects([]);
      setShowDeleteModal(false);
    } catch (e: any) {
      console.error("[Delete Error]", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteCycle = async () => {
    if (!cycle || isSaving) return;
    const currentMeta = cycle.meta_atual || 1;
    const currentMetasConcluidas = cycle.metas_concluidas || 0;
    const activePhase = (cycle as any).ciclo_atual || 1;

    if (activePhase === activeCycles.length) {
      await saveCycleState({
        meta_atual: currentMeta + 1,
        metas_concluidas: currentMetasConcluidas + 1,
        materias_concluidas_ids: []
      });
    } else {
      await saveCycleState({ metas_concluidas: currentMetasConcluidas + 1 });
    }
  };

  const concluidasIds = getProgressoIds();
  const activeCicloId = (cycle as any)?.ciclo_atual || 1;
  const activeCiclo = activeCycles.find(c => c.id === activeCicloId);
  const allMateriaDone = activeCiclo && activeCiclo.materias.length > 0 && 
    activeCiclo.materias.every(m => m.instanceId && concluidasIds.includes(m.instanceId));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* CABEÇALHO DE INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-indigo-500 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Target size={24} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Meta Estratégica</p>
            <p className="text-2xl font-black text-white"># {cycle?.meta_atual || 1}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Trophy size={24} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Metas Concluídas</p>
            <p className="text-2xl font-black text-white">{cycle?.metas_concluidas || 0}</p>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400"><BrainCircuit size={24} /></div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fase Ativa (Auto)</p>
            <p className="text-2xl font-black text-white">Fase {activeCicloId} / {activeCycles.length || '?'}</p>
          </div>
          {isSaving && <Loader2 size={16} className="animate-spin text-indigo-500" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PAINEL DE CONFIGURAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                <Settings2 size={14} className="text-indigo-400" /> Matriz Operacional
              </h3>
              {cycle && (
                <button onClick={() => setShowDeleteModal(true)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Mat/Ciclo</label>
                  <input type="number" value={disciplinasPorCiclo} onChange={(e) => setDisciplinasPorCiclo(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Estudo(H)</label>
                  <input type="number" value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Qtde Fases</label>
                  <input type="number" value={numCiclos} onChange={(e) => setNumCiclos(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-3 text-xs text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <label className="text-[9px] font-black text-slate-500 mb-2 block tracking-widest">Vincular Matéria à Base</label>
                <div className="space-y-4">
                  <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none">
                    <option value="">SELECIONE...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={nivel} onChange={(e) => setNivel(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white">
                      {Object.values(NivelConhecimento).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select value={peso} onChange={(e) => setPeso(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white">
                      {Object.values(PesoDisciplina).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <button onClick={async () => {
                    const base = subjects.find(s => String(s.id) === String(selectedSubjectId));
                    if (!base) return;
                    const next = [...configSubjects, { ...base, nivelConhecimento: nivel, peso, tempoEstudo: calcularTempoEstudo(nivel, peso) }];
                    setConfigSubjects(next);
                    setSelectedSubjectId('');
                    await saveCycleState({ config_disciplinas: next });
                  }} disabled={!selectedSubjectId || isSaving} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-white/5 active:scale-95 disabled:opacity-50">
                    <Plus size={14}/> VINCULAR
                  </button>
                </div>
              </div>

              {configSubjects.length > 0 && (
                <div className="pt-4">
                  <button onClick={handleGenerateManualCycle} disabled={isSaving} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={18} />}
                    GERAR CICLO ESTRATÉGICO
                  </button>
                </div>
              )}

              <div className="mt-8 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <p className="text-[8px] font-black text-slate-600 uppercase mb-3 tracking-widest">Base de Matérias Selecionadas ({configSubjects.length})</p>
                {configSubjects.map(s => (
                  <div key={s.id} className="group flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">{s.name}</p>
                      <p className="text-[8px] text-slate-500 uppercase font-black mt-0.5">{s.nivelConhecimento} • {s.tempoEstudo}M</p>
                    </div>
                    <button onClick={async () => {
                      const next = configSubjects.filter(ps => ps.id !== s.id);
                      setConfigSubjects(next);
                      await saveCycleState({ config_disciplinas: next });
                    }} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LISTA DE CICLOS */}
        <div className="lg:col-span-8">
          {activeCycles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCycles.map((ciclo) => {
                const isCicloFullyMarked = ciclo.materias.length > 0 && 
                  ciclo.materias.every(m => m.instanceId && concluidasIds.includes(m.instanceId));
                const isActive = ciclo.id === activeCicloId;
                const isCompleted = isCicloFullyMarked && ciclo.id < activeCicloId;
                const progressCount = ciclo.materias.filter(m => concluidasIds.includes(m.instanceId || '')).length;
                const percent = (progressCount / (ciclo.materias.length || 1)) * 100;

                return (
                  <div key={ciclo.id} onDragOver={handleDragOver} onDrop={() => handleDrop(ciclo.id)} className={`glass-card overflow-hidden transition-all duration-500 border-2 ${isActive ? 'border-indigo-500 scale-[1.02] shadow-2xl' : isCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/5 opacity-80'}`}>
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Setor 0{ciclo.id}</p>
                          {isCompleted && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-1">Finalizada</span>}
                          {isActive && <span className="bg-indigo-500/10 text-indigo-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase mb-1">Fase Ativa</span>}
                        </div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tighter">FASE {ciclo.id}</h4>
                      </div>
                      <div className="text-right">
                         <Clock size={18} className="text-indigo-400 ml-auto mb-1" />
                         <p className="text-[10px] font-black text-slate-300">{Math.floor(ciclo.tempoTotal / 60)}H {ciclo.tempoTotal % 60}M</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-900 w-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${isCompleted ? 100 : percent}%` }} />
                    </div>
                    <div className="p-6 space-y-3 min-h-[200px]">
                      {ciclo.materias.map((m, idx) => {
                        const isDone = concluidasIds.includes(m.instanceId || '');
                        return (
                          <div key={m.instanceId || idx} draggable={!isSaving} onDragStart={() => handleDragStart(ciclo.id, idx)} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${isDone ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-black/30 border-white/5'}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="cursor-grab active:cursor-grabbing text-slate-700 hover:text-indigo-500"><GripVertical size={14} /></div>
                              <button disabled={isSaving} onClick={() => m.instanceId && handleToggleMateria(m.instanceId)} className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-transparent border-slate-700 hover:border-indigo-500'}`}>
                                {isDone && <CheckCircle2 size={12} strokeWidth={3} />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <span className={`text-[11px] font-black uppercase tracking-tight truncate block ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{m.name}</span>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{m.tempoEstudo}M</span>
                              </div>
                            </div>
                            <button disabled={isSaving} onClick={(e) => { e.stopPropagation(); m.instanceId && deleteMateriaFromCycle(ciclo.id, m.instanceId); }} className="p-2 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                          </div>
                        );
                      })}
                      {isActive && (
                        <button disabled={!allMateriaDone || isSaving} onClick={handleCompleteCycle} className={`w-full mt-6 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${allMateriaDone ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}>
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : allMateriaDone ? <><Zap size={16} /> AVANÇAR E ARQUIVAR</> : <>CONCLUA OS OBJETIVOS <AlertCircle size={16} /></>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-24 glass-card rounded-[3rem] border-dashed border-white/5 opacity-50">
               <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5 transition-all duration-700">
                 <Wand2 size={40} className="text-slate-700" />
               </div>
               <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Plano pronto para Materializar</h3>
               <p className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] max-w-xs leading-relaxed">Configure as disciplinas na base lateral e use o motor estratégico para gerar sua sugestão de metas.</p>
               {configSubjects.length > 0 && (
                 <button disabled={isSaving} onClick={handleGenerateManualCycle} className="mt-8 px-10 py-4 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50">
                   {isSaving ? 'Sincronizando...' : 'Gerar Sugestão Agora'}
                 </button>
               )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PURGA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="glass-card w-full max-sm p-10 rounded-[2.5rem] border border-rose-500/20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6 border border-rose-500/20"><AlertTriangle size={32}/></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">EXPURGAR PLANO?</h3>
              <p className="text-slate-400 text-xs font-bold uppercase mb-8 leading-relaxed tracking-wide">Esta ação destruirá permanentemente seu ciclo de estudos atual no banco de dados.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDeletePlan} disabled={isSaving} className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldX size={14} />} CONFIRMAR PURGA
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white">MANTER CICLO</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Ciclos;
