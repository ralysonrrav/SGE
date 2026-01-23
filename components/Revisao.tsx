
import React, { useState } from 'react';
import { Subject, Topic, User } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  RefreshCcw, Bell, CheckCircle, Calendar, Clock, Target, Check, Activity, 
  ArrowRight, AlertCircle, History, X, CheckCircle2, Loader2
} from 'lucide-react';

interface RevisaoProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onAddLog: (minutes: number, topicId: string, subjectId: string, date: string) => void;
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
    if (isDone) return { label: 'Concluída', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10', icon: <CheckCircle2 size={12} /> };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(date); target.setHours(0,0,0,0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return { label: 'Atrasada', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/10', icon: <AlertCircle size={12} /> };
    if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-600 bg-amber-50 animate-pulse', icon: <Bell size={12} /> };
    return { label: `Em ${diffDays}d`, color: 'text-slate-400 bg-slate-50 dark:bg-slate-800', icon: <Calendar size={12} /> };
  };

  const saveStats = async (subjectId: string, topicId: string) => {
    if (!selectedMilestone) { alert("Selecione o marco (7, 15 ou 30)."); return; }
    
    setIsSaving(true);
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;

    // 1. Preparar os novos tópicos atualizados
    const updatedTopics = subject.topics.map(t => String(t.id) === String(topicId) ? {
      ...t,
      studyTimeMinutes: (t.studyTimeMinutes || 0) + editMinutes,
      questionsAttempted: (t.questionsAttempted || 0) + editAttempted,
      questionsCorrect: (t.questionsCorrect || 0) + editCorrect,
      revisionsDone: Array.from(new Set([...(t.revisionsDone || []), selectedMilestone]))
    } : t);

    try {
      // 2. Sincronizar com o Supabase
      if (supabase && user.role !== 'visitor' && !String(subjectId).startsWith('local-')) {
        const { error } = await supabase
          .from('subjects')
          .update({ topics: updatedTopics })
          .eq('id', subjectId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // 3. Atualizar Estado Local
      setSubjects(prev => prev.map(s => String(s.id) === String(subjectId) ? { ...s, topics: updatedTopics } : s));
      
      // 4. Registrar o Log de Tempo (Sessão de Revisão)
      if (editMinutes > 0) {
        onAddLog(editMinutes, topicId, subjectId, new Date().toISOString());
      }

      setEditingTopicId(null);
    } catch (err: any) {
      console.error("Erro ao salvar revisão:", err);
      alert("Erro ao sincronizar revisão. Dados salvos apenas localmente.");
    } finally {
      setIsSaving(false);
    }
  };

  const completedTopics = getAllCompletedTopics();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Painel de Revisões</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Ciclo inalterável de 7, 15 e 30 dias baseado na Curva de Esquecimento.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {completedTopics.length > 0 ? (
            completedTopics.map(({ subject, topic }) => {
              const done = topic.revisionsDone || [];
              const m7 = calculateMilestoneDate(topic.lastStudiedAt!, 7);
              const m15 = calculateMilestoneDate(topic.lastStudiedAt!, 15);
              const m30 = calculateMilestoneDate(topic.lastStudiedAt!, 30);

              return (
                <div key={topic.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">{subject.name}</p>
                          <h3 className="font-bold text-slate-800 dark:text-white text-lg">{topic.title}</h3>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setEditingTopicId(topic.id); setEditMinutes(0); setSelectedMilestone(null); }} 
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <CheckCircle size={18} /> Concluir Marco
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[ {v:7,d:m7},{v:15,d:m15},{v:30,d:m30} ].map(m => {
                        const s = getStatusInfo(m.d, done.includes(m.v));
                        return (
                          <div key={m.v} className={`flex flex-col p-4 rounded-2xl border ${done.includes(m.v) ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800'}`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{m.v} Dias</span>
                            <span className="text-xs font-bold dark:text-slate-300">{m.d.toLocaleDateString()}</span>
                            <div className={`mt-2 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.color}`}>{s.icon} {s.label}</div>
                          </div>
                        );
                      })}
                    </div>

                    {editingTopicId === topic.id && (
                      <div className="mt-6 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border dark:border-indigo-900/30 rounded-2xl animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div><label className="text-[10px] font-black text-slate-400 uppercase">Marco</label>
                            <select className="w-full mt-1 p-2 rounded-lg border dark:bg-slate-950 dark:text-white outline-none font-bold" onChange={(e)=>setSelectedMilestone(parseInt(e.target.value))}>
                              <option value="">Selecione...</option>
                              {[7,15,30].map(v => <option key={v} value={v} disabled={done.includes(v)}>{v} Dias</option>)}
                            </select>
                          </div>
                          <div><label className="text-[10px] font-black text-slate-400 uppercase">Minutos</label>
                            <input type="number" className="w-full mt-1 p-2 rounded-lg border dark:bg-slate-950 dark:text-white font-bold" value={editMinutes} onChange={(e)=>setEditMinutes(parseInt(e.target.value)||0)} />
                          </div>
                          <div><label className="text-[10px] font-black text-slate-400 uppercase">Acertos/Questões</label>
                            <div className="flex gap-1 mt-1">
                              <input type="number" className="w-1/2 p-2 rounded-lg border dark:bg-slate-950 dark:text-white font-bold" placeholder="Acertos" onChange={(e)=>setEditCorrect(parseInt(e.target.value)||0)} />
                              <input type="number" className="w-1/2 p-2 rounded-lg border dark:bg-slate-950 dark:text-white font-bold" placeholder="Total" onChange={(e)=>setEditAttempted(parseInt(e.target.value)||0)} />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={()=>setEditingTopicId(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                          <button 
                            onClick={()=>saveStats(subject.id, topic.id)} 
                            disabled={isSaving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-md flex items-center gap-2"
                          >
                            {isSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                            {isSaving ? 'SALVANDO...' : 'SALVAR REVISÃO'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-800 p-20 text-center">
              <RefreshCcw size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">Conclua tópicos no Edital para ver os ciclos de revisão aqui.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden transition-colors">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-indigo-400" /> Por que 7/15/30?</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">Diferente de sistemas que empurram prazos, aqui os marcos são fixos a partir da data de estudo original, garantindo que você enfrente a Curva de Esquecimento nos momentos críticos de retenção.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><History size={18} className="text-indigo-500" /> Legenda</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Concluída</span></div>
              <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-[10px] font-bold text-slate-500 uppercase">Vence Hoje</span></div>
              <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Atrasada</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revisao;
