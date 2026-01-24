
import React, { useState, useCallback } from 'react';
import { Subject, Topic, PredefinedEdital, User } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, TrendingUp, Save, Clock, Calendar, X, DownloadCloud, Target, BarChart
} from 'lucide-react';

interface DisciplinasProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string, date: string) => void;
}

const Disciplinas: React.FC<DisciplinasProps> = ({ user, subjects, setSubjects, predefinedEditais, onAddLog }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [activeProgressTopic, setActiveProgressTopic] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  // Modal Progress State
  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const handleSubjectUpdate = useCallback(async (subjectId: string, updatedTopics: Topic[]) => {
    const sId = String(subjectId);
    setSubjects(prev => {
      const next = prev.map(s => String(s.id) === sId ? { ...s, topics: updatedTopics } : s);
      return next;
    });

    if (supabase && !sId.startsWith('local-') && !sId.startsWith('imported-')) {
      setIsSyncing(sId);
      try { 
        await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', sId).eq('user_id', user.id);
      } catch (err: any) { 
        if (!isNetworkError(err)) console.error("Database Sync Failed:", err);
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
        const { data } = await supabase.from('subjects').insert([{ 
          name: newSub.name, 
          topics: [], 
          user_id: user.id,
          color: newSub.color
        }]).select().single();
        if (data) setSubjects(prev => prev.map(s => s.id === tempId ? { ...s, id: String(data.id) } : s));
      } catch (e) {}
    }
  };

  const deleteSubject = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (!window.confirm("Excluir esta disciplina permanentemente?")) return;

    const sId = String(subjectId);
    setSubjects(prev => prev.filter(s => String(s.id) !== sId));

    if (supabase && !sId.startsWith('local-') && !sId.startsWith('imported-')) {
      try {
        await supabase.from('subjects').delete().eq('id', sId).eq('user_id', user.id);
      } catch (err) { console.error(err); }
    }
  };

  const importFromCatalog = async (edital: PredefinedEdital) => {
    const clonedSubjects: Subject[] = edital.subjects.map((sub, idx) => ({
      ...sub,
      id: `imported-${Date.now()}-${idx}`,
      topics: sub.topics.map(topic => ({
        ...topic,
        id: `topic-${Math.random().toString(36).substr(2, 9)}`,
        completed: false,
        studyTimeMinutes: 0,
        questionsAttempted: 0,
        questionsCorrect: 0
      }))
    }));

    setSubjects(prev => [...prev, ...clonedSubjects]);
    setShowCatalog(false);

    if (supabase && user.role !== 'visitor') {
      for (const sub of clonedSubjects) {
        try {
          await supabase.from('subjects').insert([{ name: sub.name, topics: sub.topics, color: sub.color, user_id: user.id }]);
        } catch (e) {}
      }
    }
  };

  const toggleTopic = async (subId: string, topicId: string) => {
    const sub = subjects.find(s => String(s.id) === String(subId));
    if (!sub) return;
    const next = sub.topics.map(t => String(t.id) === String(topicId) ? { ...t, completed: !t.completed } : t);
    await handleSubjectUpdate(subId, next);
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
          <h2 className="text-4xl font-black text-white tracking-tighter">QUESTS ATIVAS</h2>
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
                <button onClick={() => importFromCatalog(edital)} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">IMPORTAR</button>
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
                <div className="flex items-center gap-6">
                  <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: sub.color }} />
                  <div>
                    <h3 className="font-black text-lg text-white tracking-tight uppercase">{sub.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                       <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-1000" style={{ backgroundColor: sub.color, width: `${perc}%` }} />
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{done}/{total} COMPLETO</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => deleteSubject(e, String(sub.id))} className="p-2 text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-lg transition-all ${isExp ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                    {isExp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {isExp && (
                <div className="px-10 pb-10 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="ADICIONAR NOVA TASK..." className="flex-1 px-5 py-4 rounded-xl bg-black/40 border border-white/5 text-white font-black text-[10px] tracking-widest uppercase outline-none focus:border-indigo-500" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (async () => {
                        const nt: Topic = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3, studyTimeMinutes: 0, questionsAttempted: 0, questionsCorrect: 0 };
                        await handleSubjectUpdate(String(sub.id), [...sub.topics, nt]);
                        setNewTopicTitle('');
                      })()} />
                  </div>

                  <div className="space-y-2">
                    {sub.topics.map(topic => (
                      <div key={topic.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 bg-black/20 rounded-2xl border border-white/5 group hover:border-indigo-500/50 transition-all">
                        <div className="flex items-center gap-4 flex-1">
                          <button onClick={() => toggleTopic(String(sub.id), topic.id)} className={`transition-all ${topic.completed ? 'text-indigo-500' : 'text-slate-700 hover:text-indigo-400'}`}>
                            <CheckCircle size={24} strokeWidth={3} />
                          </button>
                          <div className="flex-1">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${topic.completed ? 'text-slate-600 line-through' : 'text-white'}`}>{topic.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded border border-white/5"><Clock size={10} /> {topic.studyTimeMinutes || 0}m</div>
                           <button onClick={() => setActiveProgressTopic(topic.id)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">LOG</button>
                           <button onClick={async () => { const nt = sub.topics.filter(t => t.id !== topic.id); await handleSubjectUpdate(String(sub.id), nt); }} className="p-2 text-slate-500 hover:text-rose-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-indigo-500/20">
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">CONSOLIDAR SESSÃO</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-8">Registro de Combate / Tópico</p>
            <div className="space-y-6">
              <input type="date" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg outline-none" placeholder="Horas" value={progHours || ''} onChange={e => setProgHours(parseInt(e.target.value) || 0)} />
                <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-lg outline-none" placeholder="Mins" value={progMinutes || ''} onChange={e => setProgMinutes(parseInt(e.target.value) || 0)} />
              </div>
              <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                 <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none" placeholder="Questões" value={progAttempted || ''} onChange={e => setProgAttempted(parseInt(e.target.value) || 0)} />
                 <input type="number" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white font-black text-sm outline-none" placeholder="Acertos" value={progCorrect || ''} onChange={e => setProgCorrect(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <button onClick={() => { const sId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id; if(sId) saveTopicProgress(sId, activeProgressTopic); }} className="w-full bg-indigo-600 text-white font-black py-5 rounded-xl mt-10 hover:bg-indigo-500 transition-all uppercase text-[10px] tracking-widest">SALVAR DADOS</button>
            <button onClick={() => setActiveProgressTopic(null)} className="w-full mt-2 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disciplinas;
