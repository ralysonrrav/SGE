
import React, { useState } from 'react';
import { Subject, Topic, User, StudySession } from '../types';
import { supabase } from '../lib/supabase';
import { 
  RefreshCcw, Bell, CheckCircle, Calendar, AlertCircle, History, CheckCircle2, Loader2
} from 'lucide-react';

interface RevisaoProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  // Fixed onAddLog signature to be consistent with StudySession type used in handleAddLogLocally in App.tsx
  onAddLog: (log: StudySession) => void;
}

const Revisao: React.FC<RevisaoProps> = ({ user, subjects, setSubjects, onAddLog }) => {
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAttempted, setEditAttempted] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getAllCompletedTopics = () => {
    const list: { subject: Subject; topic: Topic }[] = [];
    subjects.forEach(s => s.topics.forEach(t => {
      if (t.completed && t.lastStudiedAt) list.push({ subject: s, topic: t });
    }));
    return list.sort((a, b) => new Date(b.topic.lastStudiedAt!).getTime() - new Date(a.topic.lastStudiedAt!).getTime());
  };

  const calculateMilestoneDate = (baseDate: string, days: number) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date;
  };

  const getStatusInfo = (date: Date, isDone: boolean) => {
    if (isDone) return { label: 'Concluída', color: 'text-emerald-500 bg-emerald-500/10', icon: <CheckCircle2 size={12} /> };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(date); target.setHours(0,0,0,0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return { label: 'Atrasada', color: 'text-rose-500 bg-rose-500/10', icon: <AlertCircle size={12} /> };
    if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-600 bg-amber-500/10 animate-pulse', icon: <Bell size={12} /> };
    return { label: `Em ${diffDays}d`, color: 'text-slate-400 bg-slate-800', icon: <Calendar size={12} /> };
  };

  const saveStats = async (subjectId: string, topicId: string) => {
    if (!selectedMilestone) { alert("Selecione o marco (7, 15 ou 30)."); return; }
    setIsSaving(true);
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;

    const updatedTopics = subject.topics.map(t => String(t.id) === String(topicId) ? {
      ...t,
      studyTimeMinutes: (t.studyTimeMinutes || 0) + editMinutes,
      questionsAttempted: (t.questionsAttempted || 0) + editAttempted,
      questionsCorrect: (t.questionsCorrect || 0) + editCorrect,
      revisionsDone: Array.from(new Set([...(t.revisionsDone || []), selectedMilestone]))
    } : t);

    try {
      if (supabase && user.role !== 'visitor' && !String(subjectId).startsWith('local-')) {
        await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', subjectId).eq('user_id', user.id);
      }
      setSubjects(prev => prev.map(s => String(s.id) === String(subjectId) ? { ...s, topics: updatedTopics } : s));
      
      // Fixed: Construct a StudySession object for consistency with other components and passed handler
      if (editMinutes > 0) {
        onAddLog({
          id: `rev-${Date.now()}`,
          topicId: topicId,
          subjectId: subjectId,
          minutes: editMinutes,
          date: new Date().toISOString(),
          type: 'revisao'
        });
      }
      setEditingTopicId(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const completedTopics = getAllCompletedTopics();

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">SINCRONIA DE REVISÃO</h2>
        <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Protocolo Baseado na Curva de Esquecimento</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {completedTopics.length > 0 ? (
            completedTopics.map(({ subject, topic }) => {
              const done = topic.revisionsDone || [];
              return (
                <div key={topic.id} className="glass-card rounded-[2rem] border border-white/5 overflow-hidden transition-all group">
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{subject.name}</p>
                          <h3 className="font-black text-white text-lg tracking-tight uppercase">{topic.title}</h3>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setEditingTopicId(topic.id); setEditMinutes(0); setSelectedMilestone(null); }} 
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2"
                      >
                        <RefreshCcw size={14} /> EXECUTAR MARCO
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[ 7, 15, 30 ].map(days => {
                        const mDate = calculateMilestoneDate(topic.lastStudiedAt!, days);
                        const s = getStatusInfo(mDate, done.includes(days));
                        return (
                          <div key={days} className={`flex flex-col p-5 rounded-2xl border ${done.includes(days) ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/40 border-white/5'}`}>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{days} DIAS</span>
                            <span className="text-xs font-black text-white mt-1">{mDate.toLocaleDateString()}</span>
                            <div className={`mt-3 flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${s.color}`}>{s.icon} {s.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {editingTopicId === topic.id && (
                      <div className="mt-8 p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Marco Alvo</label>
                             <select className="w-full p-4 rounded-xl border border-white/10 bg-black/60 text-white font-black text-xs outline-none focus:border-indigo-500" onChange={(e)=>setSelectedMilestone(parseInt(e.target.value))}>
                               <option value="">Selecione...</option>
                               {[7,15,30].map(v => <option key={v} value={v} disabled={done.includes(v)}>{v} Dias</option>)}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Minutos</label>
                             <input type="number" className="w-full p-4 rounded-xl border border-white/10 bg-black/60 text-white font-black text-xs outline-none" value={editMinutes} onChange={(e)=>setEditMinutes(parseInt(e.target.value)||0)} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Performance (Acertos/Questões)</label>
                             <div className="flex gap-2">
                               <input type="number" className="w-1/2 p-4 rounded-xl border border-white/10 bg-black/60 text-white font-black text-xs" placeholder="OK" onChange={(e)=>setEditCorrect(parseInt(e.target.value)||0)} />
                               <input type="number" className="w-1/2 p-4 rounded-xl border border-white/10 bg-black/60 text-white font-black text-xs" placeholder="TOTAL" onChange={(e)=>setEditAttempted(parseInt(e.target.value)||0)} />
                             </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button onClick={()=>setEditingTopicId(null)} className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">CANCELAR</button>
                          <button 
                            onClick={()=>saveStats(subject.id, topic.id)} 
                            disabled={isSaving}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3"
                          >
                            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                            {isSaving ? 'SYNCING...' : 'CONCLUIR MISSÃO'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-card rounded-[2.5rem] p-24 text-center border-dashed border-white/5 opacity-50">
              <RefreshCcw size={48} className="mx-auto text-slate-800 mb-6" />
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em]">Sem Disciplinas em Ciclo de Revisão</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="glass-card p-10 rounded-[2.5rem] border-l-4 border-l-indigo-500">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">MANUAL TÁTICO</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-bold">
                 Diferente de sistemas que empurram prazos aleatórios, aqui os marcos são fixos. O sistema detecta automaticamente os momentos críticos de esquecimento (7, 15 e 30 dias após o estudo original).
              </p>
           </div>
           <div className="glass-card p-10 rounded-[2.5rem]">
              <h4 className="font-black text-slate-500 text-[10px] uppercase tracking-widest mb-6">LEGENDA DE STATUS</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[9px] font-black text-white uppercase tracking-widest">Protocolo Concluído</span></div>
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" /><span className="text-[9px] font-black text-white uppercase tracking-widest">Urgente: Vence Hoje</span></div>
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-[9px] font-black text-white uppercase tracking-widest">Falha: Atrasado</span></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Revisao;
