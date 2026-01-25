
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Subject, Topic, PredefinedEdital, User, StudySession } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock, Calendar, X, DownloadCloud, Target, Activity, Edit3, Check, RotateCcw, Loader2, Save, ShieldCheck, Zap, BarChart, Hash, AlertTriangle, Timer
} from 'lucide-react';

interface DisciplinasProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (log: StudySession) => void;
  onUpdateExamDate: (date: string) => void;
}

export default function Disciplinas({ user, subjects, setSubjects, predefinedEditais, onAddLog, onUpdateExamDate }: DisciplinasProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [activeProgressTopic, setActiveProgressTopic] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [tempTopicTitle, setTempTopicTitle] = useState('');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  
  const [activeModal, setActiveModal] = useState<{ 
    type: 'delete-subject' | 'delete-topic' | 'reset-topic', 
    id: string, 
    parentId?: string, 
    label: string 
  } | null>(null);
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastSavedStats, setLastSavedStats] = useState<{ mins: number, correct: number, total: number } | null>(null);

  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const handleSubjectUpdate = useCallback(async (subjectId: string, updatedTopics: Topic[], newName?: string) => {
    const sId = String(subjectId);
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { 
        ...s, 
        topics: updatedTopics,
        name: newName !== undefined ? newName : s.name 
      } : s));

    if (supabase && !sId.startsWith('local-')) {
      setIsSyncing(sId);
      try { 
        const updatePayload: any = { topics: updatedTopics };
        if (newName !== undefined) updatePayload.name = newName;
        await supabase.from('subjects').update(updatePayload).eq('id', sId).eq('user_id', user.id);
      } catch (err) {} finally { setIsSyncing(null); }
    }
  }, [setSubjects, user.id]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    const tempId = `local-${Date.now()}`;
    const newSub: Subject = { id: tempId, name: newSubjectName.trim(), topics: [], color: colors[subjects.length % colors.length] };
    setSubjects(prev => [...prev, newSub]);
    setNewSubjectName('');
    if (supabase && user.role !== 'visitor') {
      const { data } = await supabase.from('subjects').insert([{ name: newSub.name, topics: [], user_id: user.id, color: newSub.color }]).select().single();
      if (data) setSubjects(prev => prev.map(s => s.id === tempId ? { ...s, id: String(data.id) } : s));
    }
  };

  const executeResetTopic = async (subId: string, topicId: string) => {
    const sub = subjects.find(s => String(s.id) === String(subId));
    if (!sub) return;

    const next = sub.topics.map(t => String(t.id) === String(topicId) ? {
      ...t,
      studyTimeMinutes: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      lastStudiedAt: undefined
    } : t);

    if (supabase && user.role !== 'visitor') {
      await supabase.from('study_logs').delete().eq('topic_id', topicId).eq('user_id', user.id);
    }

    await handleSubjectUpdate(subId, next);
    setActiveModal(null);
  };

  const saveTopicProgress = async (subId: string, topicId: string) => {
    const sub = subjects.find(s => String(s.id) === String(subId));
    if (!sub || isSavingLog) return;
    
    setIsSavingLog(true);
    const totalMins = (progHours * 60) + (progMinutes || 0);
    const targetDate = new Date(`${progDate}T12:00:00`).toISOString();
    
    try {
      if (supabase && user.role !== 'visitor') {
        const dbSubId = isNaN(Number(subId)) ? subId : parseInt(subId);
        await supabase.from('study_logs').delete().eq('topic_id', topicId).eq('user_id', user.id);

        const { data: logData, error: logError } = await supabase.from('study_logs').insert([{
          user_id: user.id,
          subject_id: dbSubId,
          topic_id: topicId,
          minutes: totalMins,
          date: targetDate,
          type: 'estudo'
        }]).select().single();

        if (logError) throw logError;
        
        if (logData) {
          onAddLog({ ...logData, id: String(logData.id), topicId: logData.topic_id, subjectId: String(logData.subject_id) });
          setLastSavedStats({ mins: totalMins, correct: progCorrect, total: progAttempted });
          setShowSuccessToast(true); 
        }
      }

      const next = sub.topics.map(t => String(t.id) === String(topicId) ? {
        ...t, 
        studyTimeMinutes: totalMins, 
        questionsAttempted: progAttempted, 
        questionsCorrect: progCorrect, 
        lastStudiedAt: targetDate
      } : t);
      
      await handleSubjectUpdate(subId, next);
      
      setActiveProgressTopic(null);
      setProgHours(0); setProgMinutes(0); setProgAttempted(0); setProgCorrect(0);
    } catch (e) {
      console.error("Erro ao persistir sessão:", e);
    } finally {
      setIsSavingLog(false);
    }
  };

  const getEfficiencyColor = (perc: number) => {
    if (perc >= 80) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (perc >= 60) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 relative">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">QUESTS ATIVAS</h2>
          <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Propriedade de: <span className="text-white">{user.email}</span></p>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {/* REGISTRO DATA DA PROVA */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-1">META: DATA DA PROVA</label>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 group focus-within:border-indigo-500 transition-all">
              <Calendar size={14} className="text-indigo-500" />
              <input 
                type="date" 
                className="bg-transparent text-white font-black text-[10px] uppercase outline-none"
                value={user.examDate || ''}
                onChange={(e) => onUpdateExamDate(e.target.value)}
              />
            </div>
          </div>

          <button onClick={() => setShowCatalog(!showCatalog)} className={`flex items-center gap-2 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${showCatalog ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
            {showCatalog ? <X size={16} /> : <DownloadCloud size={16} />} CATÁLOGO
          </button>
          <div className="hidden md:flex gap-2">
            <input type="text" placeholder="NOVA MATÉRIA..." className="px-6 py-4 rounded-xl border border-white/10 bg-black/40 text-white font-black text-[10px] tracking-widest uppercase outline-none focus:border-indigo-500 w-64" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} />
            <button onClick={addSubject} className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95"><Plus size={20} /></button>
          </div>
        </div>
      </header>

      {showCatalog && (
        <div className="glass-card p-10 rounded-[2.5rem] animate-in slide-in-from-top-6 duration-500">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">MATRIZES NO CORE</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {predefinedEditais.map(edital => (
              <div key={edital.id} className="bg-black/40 p-8 rounded-3xl border border-white/5 hover:border-indigo-500/50 transition-all">
                <h4 className="font-black text-white mb-2 uppercase tracking-tight">{edital.name}</h4>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">{edital.organization}</p>
                <button onClick={async () => {
                   // Ao importar, se o edital tiver data, atualiza a data da prova do usuário
                   if (edital.examDate) onUpdateExamDate(edital.examDate);

                   const cloned: Subject[] = edital.subjects.map((sub, idx) => ({ ...sub, id: `local-import-${Date.now()}-${idx}`, topics: sub.topics.map(t => ({ ...t, id: `topic-${Math.random().toString(36).substr(2, 9)}`, completed: false, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0 })) }));
                   for (const s of cloned) {
                      if (supabase && user.role !== 'visitor') {
                        const { data } = await supabase.from('subjects').insert([{ name: s.name, topics: s.topics, user_id: user.id, color: s.color }]).select().single();
                        if (data) s.id = String(data.id);
                      }
                   }
                   setSubjects(prev => [...prev, ...cloned]);
                   setShowCatalog(false);
                }} className="w-full bg-white/5 border border-white/5 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">IMPORTAR</button>
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

          return (
            <div key={sub.id} className={`glass-card rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 ${isExp ? 'ring-2 ring-indigo-500/30' : ''}`}>
              <div className="p-8 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(isExp ? null : String(sub.id))}>
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-lg text-white tracking-tight uppercase truncate">{sub.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                       <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full" style={{ backgroundColor: sub.color, width: `${perc}%` }} />
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{done}/{total} COMPLETO ({perc}%)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <button onClick={(e) => { e.stopPropagation(); setActiveModal({ type: 'delete-subject', id: String(sub.id), label: sub.name }); }} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-lg transition-all ${isExp ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{isExp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                </div>
              </div>

              {isExp && (
                <div className="px-10 pb-10 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="ADICIONAR NOVO TÓPICO..." className="flex-1 px-5 py-4 rounded-xl bg-black/40 border border-white/5 text-white font-black text-[10px] uppercase outline-none focus:border-indigo-500" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (async () => {
                        if (!newTopicTitle.trim()) return;
                        const nt: Topic = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0 };
                        await handleSubjectUpdate(String(sub.id), [...sub.topics, nt]);
                        setNewTopicTitle('');
                      })()} />
                  </div>

                  <div className="space-y-3">
                    {sub.topics.map(topic => {
                      const topicPerc = topic.questionsAttempted ? Math.round(((topic.questionsCorrect || 0) / topic.questionsAttempted) * 100) : 0;
                      return (
                        <div key={topic.id} className={`flex flex-col gap-4 p-6 bg-black/30 rounded-3xl border ${topic.completed ? 'border-indigo-500/20' : 'border-white/5'}`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <button onClick={() => {
                                const next = sub.topics.map(t => t.id === topic.id ? { ...t, completed: !t.completed, concludedAt: !t.completed ? new Date().toISOString() : undefined } : t);
                                handleSubjectUpdate(String(sub.id), next);
                              }} className={`flex-shrink-0 transition-all ${topic.completed ? 'text-indigo-500' : 'text-slate-700 hover:text-indigo-400'}`}>
                                <CheckCircle size={24} strokeWidth={3} />
                              </button>
                              
                              <div className="flex-1 min-w-0">
                                {editingTopicId === topic.id ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      autoFocus
                                      className="bg-black/50 px-3 py-1 rounded-lg text-[11px] font-black uppercase text-white outline-none border border-indigo-500 w-full" 
                                      value={tempTopicTitle} 
                                      onChange={e => setTempTopicTitle(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          const next = sub.topics.map(t => t.id === topic.id ? { ...t, title: tempTopicTitle.trim() } : t);
                                          handleSubjectUpdate(String(sub.id), next);
                                          setEditingTopicId(null);
                                        }
                                        if (e.key === 'Escape') setEditingTopicId(null);
                                      }}
                                    />
                                    <button onClick={() => setEditingTopicId(null)} className="text-slate-500 flex-shrink-0"><X size={14}/></button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 group/title min-w-0">
                                      <span className={`text-[11px] font-black uppercase tracking-widest block truncate ${topic.completed ? 'text-slate-600 line-through' : 'text-white'}`}>{topic.title}</span>
                                      <button onClick={() => { setEditingTopicId(topic.id); setTempTopicTitle(topic.title); }} className="opacity-0 group-hover/title:opacity-100 transition-all text-slate-500 hover:text-indigo-400 flex-shrink-0">
                                        <Edit3 size={12} />
                                      </button>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                      <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-tighter flex-shrink-0">
                                        <Clock size={10} className="text-indigo-400" /> 
                                        {Math.floor((topic.studyTimeMinutes || 0) / 60)}H {(topic.studyTimeMinutes || 0) % 60}M
                                      </div>
                                      
                                      {topic.lastStudiedAt && (
                                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-tighter flex-shrink-0">
                                          <Calendar size={10} className="text-slate-400" /> 
                                          {new Date(topic.lastStudiedAt).toLocaleDateString('pt-BR')}
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-tighter flex-shrink-0">
                                        <Target size={10} className="text-amber-500" /> 
                                        {topic.questionsCorrect || 0} / {topic.questionsAttempted || 0} Q
                                      </div>

                                      {topic.questionsAttempted ? (
                                        <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest transition-colors flex-shrink-0 ${getEfficiencyColor(topicPerc)}`}>
                                          {topicPerc}%
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center ml-0 md:ml-4">
                               <button onClick={() => { setProgHours(0); setProgMinutes(0); setProgAttempted(0); setProgCorrect(0); setActiveProgressTopic(topic.id); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all whitespace-nowrap">REGISTRAR SESSÃO</button>
                               <button onClick={(e) => { e.stopPropagation(); setActiveModal({ type: 'reset-topic', id: topic.id, parentId: String(sub.id), label: topic.title }); }} className="p-2.5 bg-white/5 text-slate-500 hover:text-amber-500 rounded-xl transition-all flex-shrink-0" title="Resetar Progresso">
                                  <RotateCcw size={16} />
                               </button>
                               <button onClick={() => setActiveModal({ type: 'delete-topic', id: topic.id, parentId: String(sub.id), label: topic.title })} className="p-2.5 text-slate-600 hover:text-rose-500 transition-colors flex-shrink-0"><Trash2 size={16} /></button>
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

      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tighter">REGISTRAR SESSÃO DE ESTUDO</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Data do Registro</label>
                <input type="date" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Horas</label>
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg" placeholder="0" value={progHours || ''} onChange={e => setProgHours(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Minutos</label>
                  <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg" placeholder="0" value={progMinutes || ''} onChange={e => setProgMinutes(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total Questões</label>
                    <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm" placeholder="0" value={progAttempted || ''} onChange={e => setProgAttempted(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Acertos</label>
                    <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm" placeholder="0" value={progCorrect || ''} onChange={e => setProgCorrect(parseInt(e.target.value) || 0)} />
                  </div>
              </div>
            </div>
            <button disabled={isSavingLog} onClick={() => { const sId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id; if(sId) saveTopicProgress(String(sId), activeProgressTopic); }} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl mt-10 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3">
              {isSavingLog ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSavingLog ? 'SINCRONIZANDO...' : 'SALVAR NO HISTÓRICO'}
            </button>
            <button onClick={() => setActiveProgressTopic(null)} className="w-full mt-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white">DESCATAR ALTERAÇÕES</button>
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className={`glass-card w-full max-w-sm p-10 rounded-[2.5rem] border ${activeModal.type === 'reset-topic' ? 'border-amber-500/20' : 'border-rose-500/20'} text-center`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${activeModal.type === 'reset-topic' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {activeModal.type === 'reset-topic' ? <AlertTriangle size={32}/> : <Trash2 size={32}/>}
              </div>
              
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">
                {activeModal.type === 'reset-topic' ? 'RESETAR PROGRESSO?' : `REMOVER ${activeModal.type.includes('subject') ? 'DISCIPLINA' : 'TÓPICO'}?`}
              </h3>
              
              <p className="text-slate-400 text-xs font-bold uppercase mb-8 leading-relaxed">
                {activeModal.type === 'reset-topic' 
                  ? `Deseja zerar todas as estatísticas de "${activeModal.label}"? O tópico continuará no edital, mas o tempo e questões serão limpos.`
                  : `Esta ação apagará permanentemente "${activeModal.label}" e todos os dados vinculados.`}
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    if (activeModal.type === 'delete-subject') {
                      setSubjects(prev => prev.filter(s => String(s.id) !== activeModal.id));
                      if (supabase && !activeModal.id.startsWith('local-')) {
                        await supabase.from('subjects').delete().eq('id', activeModal.id).eq('user_id', user.id);
                      }
                    } else if (activeModal.type === 'delete-topic') {
                      const sub = subjects.find(s => String(s.id) === activeModal.parentId);
                      if (sub) {
                        const next = sub.topics.filter(t => t.id !== activeModal.id);
                        await handleSubjectUpdate(activeModal.parentId!, next);
                      }
                    } else if (activeModal.type === 'reset-topic') {
                      await executeResetTopic(activeModal.parentId!, activeModal.id);
                    }
                    setActiveModal(null);
                  }} 
                  className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeModal.type === 'reset-topic' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'} text-white`}
                >
                  {activeModal.type === 'reset-topic' ? 'CONFIRMAR RESET' : 'EXCLUIR AGORA'}
                </button>
                <button onClick={() => setActiveModal(null)} className="py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white">CANCELAR</button>
              </div>
           </div>
        </div>
      )}

      {showSuccessToast && lastSavedStats && (
        <div className="fixed bottom-10 right-10 z-[200] animate-in slide-in-from-right-10 fade-in duration-700">
           <div className="bg-emerald-500/10 backdrop-blur-3xl border border-emerald-500/30 px-8 py-6 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.4),0_0_20px_rgba(16,185,129,0.1)] flex items-center gap-5 group overflow-hidden relative">
              <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/40 animate-out fade-out fill-mode-forwards" style={{ width: '100%', animationDuration: '4000ms', animationName: 'shrink-width' }} />
              
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform duration-500">
                <ShieldCheck size={24} />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] leading-none">CORE SYNC COMPLETE</h4>
                  <Zap size={10} className="text-amber-500 animate-pulse" />
                </div>
                <p className="text-white font-black text-sm uppercase tracking-tight flex items-center gap-2">
                   {lastSavedStats.mins > 0 ? `${lastSavedStats.mins}m Registrados` : 'Check-in Realizado'}
                   {(lastSavedStats.total > 0) && (
                     <>
                      <span className="text-slate-600">/</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <BarChart size={12}/> {lastSavedStats.correct}/{lastSavedStats.total} Acertos
                      </span>
                     </>
                   )}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Histórico atualizado com sucesso</p>
              </div>
           </div>
           
           <style dangerouslySetInnerHTML={{ __html: `
             @keyframes shrink-width {
               from { width: 100%; }
               to { width: 0%; }
             }
           `}} />
        </div>
      )}
    </div>
  );
}
