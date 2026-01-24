
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Subject, Topic, PredefinedEdital, User } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock, Calendar, X, DownloadCloud, Target, AlertTriangle, Activity, Edit3, Check, RotateCcw
} from 'lucide-react';

interface DisciplinasProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string, date: string) => void;
}

interface DeleteConfirmation {
  type: 'subject' | 'topic';
  id: string;
  parentId?: string;
  label: string;
}

interface ResetConfirmation {
  topicId: string;
  subjectId: string;
  label: string;
}

export default function Disciplinas({ user, subjects, setSubjects, predefinedEditais, onAddLog }: DisciplinasProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [activeProgressTopic, setActiveProgressTopic] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState<ResetConfirmation | null>(null);

  // Estados de Edição
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [tempEditText, setTempEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Modal Progress State
  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  useEffect(() => {
    if ((editingSubjectId || editingTopicId) && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSubjectId, editingTopicId]);

  const handleSubjectUpdate = useCallback(async (subjectId: string, updatedTopics: Topic[], newName?: string) => {
    const sId = String(subjectId);
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { 
        ...s, 
        topics: updatedTopics,
        name: newName !== undefined ? newName : s.name 
      } : s));

    if (supabase && !sId.startsWith('local-') && !sId.startsWith('imported-')) {
      setIsSyncing(sId);
      try { 
        const updatePayload: any = { topics: updatedTopics };
        if (newName !== undefined) updatePayload.name = newName;
        await supabase.from('subjects').update(updatePayload).eq('id', sId).eq('user_id', user.id);
      } catch (err: any) { 
        if (!isNetworkError(err)) console.error("Sync Failed:", err);
      } finally { setIsSyncing(null); }
    }
  }, [setSubjects, user]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    const tempId = `local-${Date.now()}`;
    const newSub: Subject = { id: tempId, name: newSubjectName.trim(), topics: [], color: colors[subjects.length % colors.length] };
    setSubjects(prev => [...prev, newSub]);
    setNewSubjectName('');

    if (supabase && user.role !== 'visitor') {
      try {
        const { data } = await supabase.from('subjects').insert([{ name: newSub.name, topics: [], user_id: user.id, color: newSub.color }]).select().single();
        if (data) setSubjects(prev => prev.map(s => s.id === tempId ? { ...s, id: String(data.id) } : s));
      } catch (e) {}
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.type === 'subject') {
      const sId = deleteConfirmation.id;
      setSubjects(prev => prev.filter(s => String(s.id) !== sId));
      if (supabase && !sId.startsWith('local-') && !sId.startsWith('imported-')) {
        try { await supabase.from('subjects').delete().eq('id', sId).eq('user_id', user.id); } catch (err) {}
      }
    } else {
      const subId = deleteConfirmation.parentId!;
      const topicId = deleteConfirmation.id;
      const sub = subjects.find(s => String(s.id) === subId);
      if (sub) {
        const next = sub.topics.filter(t => String(t.id) !== String(topicId));
        await handleSubjectUpdate(subId, next);
      }
    }
    setDeleteConfirmation(null);
  };

  const executeReset = async () => {
    if (!resetConfirmation) return;
    const { subjectId, topicId } = resetConfirmation;
    const sub = subjects.find(s => String(s.id) === subjectId);
    if (sub) {
      const next = sub.topics.map(t => String(t.id) === topicId ? { 
        ...t, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0, 
        lastStudiedAt: undefined, revisionsDone: [], completed: false
      } : t);
      await handleSubjectUpdate(subjectId, next);
    }
    setResetConfirmation(null);
  };

  const saveTopicProgress = async (subId: string, topicId: string) => {
    const sub = subjects.find(s => String(s.id) === String(subId));
    if (!sub) return;
    const totalMins = (progHours * 60) + (progMinutes || 0);
    const targetDate = new Date(`${progDate}T12:00:00`).toISOString();
    const next = sub.topics.map(t => String(t.id) === String(topicId) ? {
      ...t, 
      studyTimeMinutes: (t.studyTimeMinutes || 0) + totalMins,
      questionsAttempted: (t.questionsAttempted || 0) + progAttempted,
      questionsCorrect: (t.questionsCorrect || 0) + progCorrect,
      lastStudiedAt: targetDate
    } : t);
    if (totalMins > 0 || progAttempted > 0) onAddLog(totalMins, topicId, subId, targetDate);
    await handleSubjectUpdate(subId, next);
    setActiveProgressTopic(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">QUESTS ATIVAS</h2>
          <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Gerenciamento de Missões por Disciplina</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowCatalog(!showCatalog)} className="flex items-center gap-2 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            {showCatalog ? <X size={16} /> : <DownloadCloud size={16} />}
            CATÁLOGO MESTRE
          </button>
          <div className="hidden md:flex gap-2">
            <input type="text" placeholder="NOVA MATÉRIA..." className="px-6 py-4 rounded-xl border border-white/10 bg-black/40 text-white font-black text-[10px] tracking-widest uppercase outline-none focus:border-indigo-500 w-64" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
            <button onClick={addSubject} className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95"><Plus size={20} /></button>
          </div>
        </div>
      </header>

      {showCatalog && (
        <div className="glass-card p-10 rounded-[2.5rem] animate-in slide-in-from-top-6 duration-500">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">CATÁLOGO DE MATRIZES</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {predefinedEditais.map(edital => (
              <div key={edital.id} className="bg-black/40 p-8 rounded-3xl border border-white/5 hover:border-indigo-500/50 transition-all group">
                <h4 className="font-black text-white mb-2">{edital.name}</h4>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">{edital.organization}</p>
                <button onClick={() => {
                   const cloned: Subject[] = edital.subjects.map((sub, idx) => ({
                    ...sub, id: `imported-${Date.now()}-${idx}`, topics: sub.topics.map(t => ({ ...t, id: `topic-${Math.random().toString(36).substr(2, 9)}`, completed: false, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0 }))
                   }));
                   setSubjects(prev => [...prev, ...cloned]);
                   setShowCatalog(false);
                }} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">IMPORTAR</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {subjects.map(sub => {
          const total = sub.topics.length;
          const done = sub.topics.filter(t => t.completed).length;
          const isExp = expandedSubject === String(sub.id);
          const perc = total > 0 ? Math.round((done / total) * 100) : 0;
          const isEditing = editingSubjectId === String(sub.id);

          return (
            <div key={sub.id} className={`glass-card rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 ${isExp ? 'ring-2 ring-indigo-500/30' : ''}`}>
              <div className="p-8 flex items-center justify-between cursor-pointer" onClick={() => !isEditing && setExpandedSubject(isExp ? null : String(sub.id))}>
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: sub.color }} />
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <input ref={editInputRef} className="bg-black/40 border border-indigo-500/50 px-4 py-2 rounded-lg text-lg font-black text-white uppercase outline-none w-full max-w-md" value={tempEditText} onChange={e => setTempEditText(e.target.value)} onKeyDown={e => {
                          if (e.key === 'Enter') { handleSubjectUpdate(String(sub.id), sub.topics, tempEditText); setEditingSubjectId(null); }
                          if (e.key === 'Escape') setEditingSubjectId(null);
                        }} />
                        <button onClick={() => { handleSubjectUpdate(String(sub.id), sub.topics, tempEditText); setEditingSubjectId(null); }} className="text-emerald-500"><Check size={20}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 group/title">
                        <h3 className="font-black text-lg text-white tracking-tight uppercase">{sub.name}</h3>
                        <button onClick={(e) => { e.stopPropagation(); setEditingSubjectId(String(sub.id)); setTempEditText(sub.name); }} className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-500 hover:text-indigo-400"><Edit3 size={14} /></button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                       <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-1000" style={{ backgroundColor: sub.color, width: `${perc}%` }} />
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{done}/{total} COMPLETO</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ type: 'subject', id: String(sub.id), label: sub.name }); }} className="p-2 text-slate-500 hover:text-rose-500"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-lg ${isExp ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{isExp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                </div>
              </div>

              {isExp && (
                <div className="px-10 pb-10 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="ADICIONAR NOVA TASK..." className="flex-1 px-5 py-4 rounded-xl bg-black/40 border border-white/5 text-white font-black text-[10px] uppercase outline-none focus:border-indigo-500" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (async () => {
                        const nt: Topic = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0 };
                        await handleSubjectUpdate(String(sub.id), [...sub.topics, nt]);
                        setNewTopicTitle('');
                      })()} />
                  </div>

                  <div className="space-y-3">
                    {sub.topics.map(topic => {
                      const isEditingTopic = editingTopicId === topic.id;
                      const correctPerc = topic.questionsAttempted ? Math.round((topic.questionsCorrect! / topic.questionsAttempted!) * 100) : null;

                      return (
                        <div key={topic.id} className="flex flex-col gap-4 p-6 bg-black/30 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <button onClick={() => {
                                const next = sub.topics.map(t => t.id === topic.id ? { ...t, completed: !t.completed } : t);
                                handleSubjectUpdate(String(sub.id), next);
                              }} className={`transition-all ${topic.completed ? 'text-indigo-500' : 'text-slate-700 hover:text-indigo-400'}`}>
                                <CheckCircle size={24} strokeWidth={3} />
                              </button>
                              <div className="flex-1">
                                {isEditingTopic ? (
                                  <div className="flex items-center gap-3">
                                    <input ref={editInputRef} className="bg-black/40 border border-indigo-500/50 px-3 py-1.5 rounded-lg text-[11px] font-black text-white uppercase outline-none w-full" value={tempEditText} onChange={e => setTempEditText(e.target.value)} onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const next = sub.topics.map(t => t.id === topic.id ? { ...t, title: tempEditText } : t);
                                        handleSubjectUpdate(String(sub.id), next);
                                        setEditingTopicId(null);
                                      }
                                      if (e.key === 'Escape') setEditingTopicId(null);
                                    }} />
                                    <button onClick={() => {
                                        const next = sub.topics.map(t => t.id === topic.id ? { ...t, title: tempEditText } : t);
                                        handleSubjectUpdate(String(sub.id), next);
                                        setEditingTopicId(null);
                                    }} className="text-emerald-500"><Check size={16}/></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 group/topicTitle">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${topic.completed ? 'text-slate-600 line-through' : 'text-white'}`}>{topic.title}</span>
                                    <button onClick={() => { setEditingTopicId(topic.id); setTempEditText(topic.title); }} className="opacity-0 group-hover/topicTitle:opacity-100 p-1 text-slate-600 hover:text-indigo-400"><Edit3 size={12} /></button>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2.5">
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[8px] font-black text-indigo-400 uppercase tracking-widest"><Clock size={10} /> {topic.studyTimeMinutes || 0}m</div>
                                  {topic.lastStudiedAt && <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest"><Calendar size={10} /> {new Date(topic.lastStudiedAt).toLocaleDateString('pt-BR')}</div>}
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[8px] font-black text-emerald-500 uppercase tracking-widest"><Target size={10} /> Q: {topic.questionsAttempted || 0} / A: {topic.questionsCorrect || 0}</div>
                                  {correctPerc !== null && <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest ${correctPerc >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}><Activity size={10} /> {correctPerc}%</div>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <button onClick={() => { setProgHours(0); setProgMinutes(0); setProgAttempted(0); setProgCorrect(0); setActiveProgressTopic(topic.id); }} className="px-6 py-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">REGISTRAR SESSÃO</button>
                               <button onClick={() => setResetConfirmation({ topicId: topic.id, subjectId: String(sub.id), label: topic.title })} className="p-2.5 text-slate-600 hover:text-amber-500 bg-white/5 rounded-xl border border-white/5" title="Resetar progresso"><RotateCcw size={16} /></button>
                               <button onClick={() => setDeleteConfirmation({ type: 'topic', id: topic.id, parentId: String(sub.id), label: topic.title })} className="p-2.5 text-slate-600 hover:text-rose-500 bg-white/5 rounded-xl border border-white/5" title="Deletar tópico"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: REGISTRO DE SESSÃO */}
      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-indigo-500/20">
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">CONSOLIDAR SESSÃO</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-8">Registro de Combate / Tópico</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data da Sessão</label>
                <input type="date" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none focus:border-indigo-500" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tempo Líquido</label>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg outline-none" placeholder="H" value={progHours || ''} onChange={e => setProgHours(parseInt(e.target.value) || 0)} />
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg outline-none" placeholder="M" value={progMinutes || ''} onChange={e => setProgMinutes(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none" placeholder="Q. Totais" value={progAttempted || ''} onChange={e => setProgAttempted(parseInt(e.target.value) || 0)} />
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none" placeholder="Acertos" value={progCorrect || ''} onChange={e => setProgCorrect(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <button onClick={() => { const sId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id; if(sId) saveTopicProgress(String(sId), activeProgressTopic); }} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl mt-10 hover:bg-indigo-500 transition-all uppercase text-[10px] tracking-widest">SALVAR REGISTRO</button>
            <button onClick={() => setActiveProgressTopic(null)} className="w-full mt-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white">CANCELAR</button>
          </div>
        </div>
      )}

      {/* MODAL: RESET DE TÓPICO */}
      {resetConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[3rem] p-12 border border-amber-500/20 text-center">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-amber-500/20"><RotateCcw size={40} /></div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">ZERAR REGISTROS?</h3>
            <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10 uppercase tracking-wide">Limpar estatísticas de <span className="text-amber-400">"{resetConfirmation.label}"</span>? Ação irreversível.</p>
            <div className="flex flex-col gap-4">
              <button onClick={executeReset} className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl text-[10px] hover:bg-amber-500 transition-all uppercase tracking-widest">CONFIRMAR LIMPEZA</button>
              <button onClick={() => setResetConfirmation(null)} className="w-full py-4 text-[9px] font-black text-slate-500 uppercase">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[3rem] p-12 border border-rose-500/20 text-center">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20"><AlertTriangle size={40} /></div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">DELETAR {deleteConfirmation.type === 'subject' ? 'DISCIPLINA' : 'TÓPICO'}?</h3>
            <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10 uppercase tracking-wide">Remover <span className="text-rose-400">"{deleteConfirmation.label}"</span>? Todos os dados serão perdidos.</p>
            <div className="flex flex-col gap-4">
              <button onClick={executeDelete} className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl text-[10px] hover:bg-rose-500 transition-all uppercase tracking-widest">CONFIRMAR EXCLUSÃO</button>
              <button onClick={() => setDeleteConfirmation(null)} className="w-full py-4 text-[9px] font-black text-slate-500 uppercase">ABORTAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
