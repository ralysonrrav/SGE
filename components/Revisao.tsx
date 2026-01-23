
import React, { useState } from 'react';
import { Subject, Topic } from '../types';
import { supabase } from '../lib/supabase';
import { 
  RefreshCcw, 
  Bell, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Target, 
  Check, 
  Activity,
  ArrowRight,
  AlertCircle,
  History,
  X,
  CheckCircle2,
  Zap,
  TrendingUp,
  BarChart3,
  Save
} from 'lucide-react';

interface RevisaoProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onAddLog: (minutes: number, topicId: string, subjectId: string) => void;
}

const Revisao: React.FC<RevisaoProps> = ({ subjects, setSubjects, onAddLog }) => {
  const [activeReviewTopic, setActiveReviewTopic] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  
  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const getAllCompletedTopics = () => {
    const list: { subject: Subject; topic: Topic }[] = [];
    subjects.forEach(s => {
      s.topics.forEach(t => {
        // Agora usamos concludedAt como garantia da âncora de revisão
        if (t.completed && (t.concludedAt || t.lastStudiedAt)) {
          list.push({ subject: s, topic: t });
        }
      });
    });
    
    return list.sort((a, b) => {
      const dateA = new Date(a.topic.concludedAt || a.topic.lastStudiedAt!).getTime();
      const dateB = new Date(b.topic.concludedAt || b.topic.lastStudiedAt!).getTime();
      return dateB - dateA;
    });
  };

  const calculateMilestoneDate = (baseDate: string, days: number) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date;
  };

  const getStatusInfo = (date: Date, isDone: boolean) => {
    if (isDone) return { label: 'Concluída', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10', icon: <CheckCircle2 size={12} /> };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

    if (diffDays < 0) return { label: 'Atrasada', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/10', icon: <AlertCircle size={12} /> };
    if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10 animate-pulse', icon: <Bell size={12} /> };
    return { label: `Em ${diffDays}d`, color: 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50', icon: <Calendar size={12} /> };
  };

  const openReviewForm = (topic: Topic, milestone: number) => {
    setActiveReviewTopic(topic.id);
    setSelectedMilestone(milestone);
    setProgDate(new Date().toISOString().split('T')[0]);
    setProgHours(0);
    setProgMinutes(0);
    setProgAttempted(0);
    setProgCorrect(0);
  };

  const saveReviewProgress = async (subjectId: string, topicId: string) => {
    if (!selectedMilestone) return;

    const totalMinutes = (progHours * 60) + progMinutes;

    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => {
            if (t.id === topicId) {
              const currentRevisions = t.revisionsDone || [];
              const newRevisions = currentRevisions.includes(selectedMilestone) 
                ? currentRevisions 
                : [...currentRevisions, selectedMilestone];

              return { 
                ...t, 
                studyTimeMinutes: (t.studyTimeMinutes || 0) + totalMinutes,
                questionsAttempted: (t.questionsAttempted || 0) + progAttempted,
                questionsCorrect: (t.questionsCorrect || 0) + progCorrect,
                revisionsDone: newRevisions
              };
            }
            return t;
          })
        };
      }
      return s;
    });

    setSubjects(updatedSubjects);

    if (supabase) {
      try {
        const subject = updatedSubjects.find(s => s.id === subjectId);
        if (subject) {
          await supabase.from('subjects').update({ topics: subject.topics }).eq('id', subjectId);
        }
      } catch (err) {
        console.error("Erro ao sincronizar revisão:", err);
      }
    }

    if (totalMinutes > 0) onAddLog(totalMinutes, topicId, subjectId);
    
    setActiveReviewTopic(null);
    setSelectedMilestone(null);
  };

  const getPerformanceColor = (perc: number) => {
    if (perc >= 85) return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
    if (perc >= 70) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
    if (perc >= 50) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
  };

  const completedTopics = getAllCompletedTopics();

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      <header>
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Painel de Revisões</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Marcos automáticos de 7, 15 e 30 dias baseados na sua data de conclusão original.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {completedTopics.length > 0 ? (
            completedTopics.map(({ subject, topic }) => {
              const done = topic.revisionsDone || [];
              // Usamos concludedAt como âncora imutável
              const anchorDate = topic.concludedAt || topic.lastStudiedAt!;
              const m7 = calculateMilestoneDate(anchorDate, 7);
              const m15 = calculateMilestoneDate(anchorDate, 15);
              const m30 = calculateMilestoneDate(anchorDate, 30);
              
              const s7 = getStatusInfo(m7, done.includes(7));
              const s15 = getStatusInfo(m15, done.includes(15));
              const s30 = getStatusInfo(m30, done.includes(30));

              const isEditing = activeReviewTopic === topic.id;
              const hitRate = topic.questionsAttempted && topic.questionsAttempted > 0 
                ? Math.round((topic.questionsCorrect! / topic.questionsAttempted) * 100) 
                : 0;

              return (
                <div key={topic.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:border-indigo-100 transition-all group">
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                      <div className="flex items-start gap-5">
                        <div className="w-1.5 h-12 rounded-full mt-1" style={{ backgroundColor: subject.color }} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">{subject.name}</p>
                          <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl leading-tight transition-colors">{topic.title}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] font-black text-slate-300 uppercase flex items-center gap-1.5 transition-colors">
                              <History size={12} /> Concluído em: {new Date(anchorDate).toLocaleDateString('pt-BR')}
                            </p>
                            {hitRate > 0 && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm ${getPerformanceColor(hitRate)}`}>
                                {hitRate}% Aproveitamento Total
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!isEditing && (
                        <div className="flex gap-2">
                           <button 
                            onClick={() => {
                              const next = !done.includes(7) ? 7 : !done.includes(15) ? 15 : 30;
                              openReviewForm(topic, next);
                            }}
                            className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
                           >
                             <CheckCircle size={16} /> REVISAR AGORA
                           </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {[ 
                        { val: 7, label: '7 Dias', date: m7, status: s7 },
                        { val: 15, label: '15 Dias', date: m15, status: s15 },
                        { val: 30, label: '30 Dias', date: m30, status: s30 }
                      ].map((m, i) => (
                        <div 
                          key={i} 
                          onClick={() => !done.includes(m.val) && openReviewForm(topic, m.val)}
                          className={`flex flex-col p-4 rounded-3xl border cursor-pointer transition-all group/milestone ${
                            done.includes(m.val) 
                              ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' 
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{m.label}</span>
                             {done.includes(m.val) ? (
                               <CheckCircle2 size={14} className="text-emerald-500" />
                             ) : (
                               <Zap size={14} className="text-slate-200 group-hover/milestone:text-indigo-400 transition-colors" />
                             )}
                          </div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">{m.date.toLocaleDateString('pt-BR')}</span>
                          <div className={`mt-3 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${m.status.color}`}>
                            {m.status.icon}
                            {m.status.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {isEditing && (
                      <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/20 animate-in slide-in-from-top-4 duration-300 shadow-inner">
                        <div className="flex items-center justify-between mb-6">
                          <h5 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp size={14} /> REGISTRAR REVISÃO DE {selectedMilestone} DIAS
                          </h5>
                          <button onClick={() => setActiveReviewTopic(null)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X size={18} /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Calendar size={10} /> Data</label>
                            <input type="date" className="w-full px-4 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Clock size={10} /> Tempo Gasto</label>
                            <div className="flex gap-1 items-center">
                              <input type="number" placeholder="Hr" className="w-1/2 px-4 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progHours || ''} onChange={(e) => setProgHours(parseFloat(e.target.value) || 0)} />
                              <span className="text-slate-300">:</span>
                              <input type="number" placeholder="Min" className="w-1/2 px-4 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progMinutes || ''} onChange={(e) => setProgMinutes(parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Target size={10} /> Questões</label>
                            <input type="number" className="w-full px-4 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progAttempted || ''} onChange={(e) => setProgAttempted(parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><BarChart3 size={10} /> Acertos</label>
                            <input type="number" className="w-full px-4 py-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progCorrect || ''} onChange={(e) => setProgCorrect(parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                        
                        <div className="mt-8 flex justify-end gap-3">
                          <button onClick={() => setActiveReviewTopic(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all">CANCELAR</button>
                          <button onClick={() => saveReviewProgress(subject.id, topic.id)} className="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <Save size={16} /> CONCLUIR REVISÃO
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-800 p-24 text-center transition-colors">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-200 dark:text-slate-700 transition-colors">
                <RefreshCcw size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 transition-colors">Nenhum tópico concluído</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-sm mx-auto font-medium leading-relaxed transition-colors">Assim que você marcar tópicos como concluídos no edital, os ciclos de revisão (7, 15 e 30 dias) aparecerão aqui automaticamente.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-indigo-950 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-colors">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl transition-all" />
            <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
              <Activity size={24} className="text-indigo-400" /> Curva de Esquecimento
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-8 font-medium transition-colors">
              Nosso sistema utiliza marcos fixos baseados na data de conclusão original. Isso garante que você lute contra o esquecimento nos momentos críticos (1 semana, 2 semanas e 1 mês).
            </p>
            <div className="flex items-center gap-3 text-[10px] font-black bg-white/5 p-4 rounded-2xl border border-white/10 uppercase tracking-widest transition-colors">
              <ArrowRight size={16} className="text-indigo-400" /> Revisões não são adiáveis
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <h4 className="font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 transition-colors uppercase text-xs tracking-widest">
              <History size={18} className="text-indigo-500" /> Legenda de Status
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Concluída</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Vence Hoje</span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Atrasada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revisao;
