
import React, { useState } from 'react';
import { Subject, Topic } from '../types';
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
  CheckCircle2
} from 'lucide-react';

interface RevisaoProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onAddLog: (minutes: number, topicId: string, subjectId: string) => void;
}

const Revisao: React.FC<RevisaoProps> = ({ subjects, setSubjects, onAddLog }) => {
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  
  // Stats editing state
  const [editMinutes, setEditMinutes] = useState(0);
  const [editAttempted, setEditAttempted] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  const getAllCompletedTopics = () => {
    const list: { subject: Subject; topic: Topic }[] = [];
    subjects.forEach(s => {
      s.topics.forEach(t => {
        if (t.completed && t.lastStudiedAt) {
          list.push({ subject: s, topic: t });
        }
      });
    });
    return list.sort((a, b) => 
      new Date(b.topic.lastStudiedAt!).getTime() - new Date(a.topic.lastStudiedAt!).getTime()
    );
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

  const startEditing = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditMinutes(0);
    setEditAttempted(0);
    setEditCorrect(0);
    
    const done = topic.revisionsDone || [];
    if (!done.includes(7)) setSelectedMilestone(7);
    else if (!done.includes(15)) setSelectedMilestone(15);
    else if (!done.includes(30)) setSelectedMilestone(30);
    else setSelectedMilestone(null);
  };

  const saveStats = (subjectId: string, topicId: string) => {
    if (!selectedMilestone) {
        alert("Selecione qual marco de revisão (7, 15 ou 30 dias) você está concluindo.");
        return;
    }

    setSubjects(prev => prev.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: s.topics.map(t => {
            if (t.id === topicId) {
              const currentRevisions = t.revisionsDone || [];
              const newRevisions = currentRevisions.includes(selectedMilestone) 
                ? currentRevisions 
                : [...currentRevisions, selectedMilestone];

              if (editMinutes > 0) onAddLog(editMinutes, topicId, subjectId);

              return { 
                ...t, 
                studyTimeMinutes: (t.studyTimeMinutes || 0) + editMinutes,
                questionsAttempted: (t.questionsAttempted || 0) + editAttempted,
                questionsCorrect: (t.questionsCorrect || 0) + editCorrect,
                revisionsDone: newRevisions
              };
            }
            return t;
          })
        };
      }
      return s;
    }));
    setEditingTopicId(null);
    setSelectedMilestone(null);
  };

  const calculateHitRate = (attempted: number, correct: number) => {
    if (attempted === 0) return 0;
    return Math.round((correct / attempted) * 100);
  };

  const completedTopics = getAllCompletedTopics();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Painel de Revisões</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Ciclo fixo de 7, 15 e 30 dias. Realize revisões sem alterar seu cronograma base.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {completedTopics.length > 0 ? (
            completedTopics.map(({ subject, topic }) => {
              const done = topic.revisionsDone || [];
              const m7 = calculateMilestoneDate(topic.lastStudiedAt!, 7);
              const m15 = calculateMilestoneDate(topic.lastStudiedAt!, 15);
              const m30 = calculateMilestoneDate(topic.lastStudiedAt!, 30);
              
              const s7 = getStatusInfo(m7, done.includes(7));
              const s15 = getStatusInfo(m15, done.includes(15));
              const s30 = getStatusInfo(m30, done.includes(30));

              const currentHitRate = editAttempted > 0 ? calculateHitRate(editAttempted, editCorrect) : 0;

              return (
                <div key={topic.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{subject.name}</p>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight transition-colors">{topic.title}</h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1 transition-colors">
                            <History size={12} /> Conclusão Original: {new Date(topic.lastStudiedAt!).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => editingTopicId === topic.id ? setEditingTopicId(null) : startEditing(topic)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm
                          ${editingTopicId === topic.id ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-indigo-100 dark:shadow-none'}
                        `}
                      >
                        {editingTopicId === topic.id ? <X size={18} /> : <CheckCircle size={18} />}
                        {editingTopicId === topic.id ? 'Cancelar' : 'Concluir Revisão'}
                      </button>
                    </div>

                    {/* Milestones Timeline */}
                    <div className="grid grid-cols-3 gap-3">
                      {[ 
                        { val: 7, label: '7 Dias', date: m7, status: s7 },
                        { val: 15, label: '15 Dias', date: m15, status: s15 },
                        { val: 30, label: '30 Dias', date: m30, status: s30 }
                      ].map((m, i) => (
                        <div key={i} className={`flex flex-col p-3 rounded-2xl border transition-all ${done.includes(m.val) ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                          <div className="flex justify-between items-start mb-1">
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase transition-colors">{m.label}</span>
                             {done.includes(m.val) && <CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400" />}
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">{m.date.toLocaleDateString('pt-BR')}</span>
                          <div className={`mt-2 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase transition-colors ${m.status.color}`}>
                            {m.status.icon}
                            {m.status.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Integrated Editing Panel */}
                    {editingTopicId === topic.id && (
                      <div className="mt-6 p-5 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                        <div className="mb-4">
                           <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 transition-colors">Qual marco está concluindo?</label>
                           <div className="flex gap-2">
                             {[7, 15, 30].map(m => (
                               <button
                                 key={m}
                                 onClick={() => setSelectedMilestone(m)}
                                 className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selectedMilestone === m ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-300 transition-all'}`}
                               >
                                 {m} Dias
                               </button>
                             ))}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 transition-colors">
                              <Clock size={10} /> Tempo Gasto (Min)
                            </label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors"
                              value={editMinutes}
                              onChange={(e) => setEditMinutes(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 transition-colors">
                              <Target size={10} /> Questões Feitas
                            </label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors"
                              value={editAttempted}
                              onChange={(e) => setEditAttempted(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1 transition-colors">
                              <Check size={10} /> Acertos
                            </label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors"
                              value={editCorrect}
                              onChange={(e) => setEditCorrect(parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        {editAttempted > 0 && (
                          <div className="mt-4 flex items-center gap-2">
                             <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                                <div 
                                  className={`h-full transition-all duration-500 ${currentHitRate >= 80 ? 'bg-emerald-500' : currentHitRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${currentHitRate}%` }}
                                />
                             </div>
                             <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 transition-colors">{currentHitRate}% APROVEITAMENTO</span>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/30 transition-colors">
                          <button 
                            onClick={() => setEditingTopicId(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            Descartar
                          </button>
                          <button 
                            onClick={() => saveStats(subject.id, topic.id)}
                            className="px-6 py-2 text-xs font-bold bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-md dark:shadow-none transition-all flex items-center gap-2"
                          >
                            <CheckCircle size={14} /> Salvar e Finalizar Marco
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-800 p-20 text-center transition-colors">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700 transition-colors">
                <RefreshCcw size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 transition-colors">Nada para revisar ainda</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto font-medium transition-colors">Os ciclos de 7, 15 e 30 dias aparecerão aqui assim que você concluir tópicos no edital.</p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-slate-800 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl transition-all" />
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Activity size={20} className="text-indigo-400 dark:text-indigo-300" /> Ciclo Inalterável
            </h3>
            <p className="text-slate-400 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium transition-colors">
              Diferente de outros apps, aqui sua revisão concluída não "empurra" a próxima. Os marcos de 7, 15 e 30 dias são calculados a partir da sua primeira vitória no tópico.
            </p>
            <div className="flex items-center gap-2 text-xs font-black bg-white/5 p-3 rounded-xl border border-white/10 uppercase tracking-tighter transition-colors">
              <ArrowRight size={14} className="text-indigo-400" /> Foco na Curva de Esquecimento Real
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 transition-colors">
              <History size={18} className="text-indigo-500 dark:text-indigo-400" /> Legenda de Status
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase transition-colors">Concluída (Missão Cumprida)</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase transition-colors">Vence Hoje (Prioridade)</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase transition-colors">Atrasada (Atenção!)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revisao;
