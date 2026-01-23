
import React, { useState } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  BookOpen, 
  X, 
  Edit3, 
  Check,
  Layers,
  Database,
  ArrowRight,
  Clock,
  Target,
  Trophy,
  Activity,
  Zap
} from 'lucide-react';

interface DisciplinasProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string) => void;
}

interface TopicToDelete {
  subjectId: string;
  topicId: string;
  title: string;
}

const Disciplinas: React.FC<DisciplinasProps> = ({ subjects, setSubjects, predefinedEditais, onAddLog }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  
  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [activeSubjectForBulk, setActiveSubjectForBulk] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<TopicToDelete | null>(null);

  // Editing and Performance Logging states
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [loggingTopicId, setLoggingTopicId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Performance inputs
  const [logHours, setLogHours] = useState('1');
  const [logMinutes, setLogMinutes] = useState('0');
  const [logAttempted, setLogAttempted] = useState('0');
  const [logCorrect, setLogCorrect] = useState('0');

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSub: Subject = {
      id: Date.now().toString(),
      name: newSubjectName,
      topics: [],
      color: colors[subjects.length % colors.length]
    };
    setSubjects([...subjects, newSub]);
    setNewSubjectName('');
  };

  const addTopic = (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          topics: [...s.topics, { 
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
            title: newTopicTitle, 
            completed: false, 
            importance: 3,
            studyTimeMinutes: 0,
            questionsAttempted: 0,
            questionsCorrect: 0
          }]
        };
      }
      return s;
    }));
    setNewTopicTitle('');
  };

  const handleSavePerformance = (subjectId: string, topicId: string) => {
    const h = parseInt(logHours) || 0;
    const m = parseInt(logMinutes) || 0;
    const totalMinutes = (h * 60) + m;
    const attempted = parseInt(logAttempted) || 0;
    const correct = parseInt(logCorrect) || 0;

    if (totalMinutes <= 0 && attempted <= 0) return;

    onAddLog(totalMinutes, topicId, subjectId);
    
    setSubjects(prev => prev.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.map(t => t.id === topicId ? { 
        ...t, 
        studyTimeMinutes: (t.studyTimeMinutes || 0) + totalMinutes,
        questionsAttempted: (t.questionsAttempted || 0) + attempted,
        questionsCorrect: (t.questionsCorrect || 0) + correct,
        lastStudiedAt: new Date().toISOString()
      } : t)
    } : s));

    setLoggingTopicId(null);
    setLogHours('1'); setLogMinutes('0'); setLogAttempted('0'); setLogCorrect('0');
  };

  const getAccuracyColor = (perc: number) => {
    if (perc >= 80) return 'text-emerald-500';
    if (perc >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getAccuracyBg = (perc: number) => {
    if (perc >= 80) return 'bg-emerald-50 dark:bg-emerald-900/20';
    if (perc >= 60) return 'bg-amber-50 dark:bg-amber-900/20';
    return 'bg-rose-50 dark:bg-rose-900/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Edital Verticalizado</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Controle seu domínio e performance por tópico.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatalogOpen(true)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0">
            <Database size={18} /> CATÁLOGO
          </button>
          <input
            type="text"
            placeholder="Nova disciplina..."
            className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-48 shadow-sm transition-all text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-bold"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSubject()}
          />
          <button onClick={addSubject} className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shrink-0">
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {subjects.map(subject => {
          const completedT = subject.topics.filter(t => t.completed).length;
          return (
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{subject.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{completedT} / {subject.topics.length} concluídos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); setSubjectToDelete(subject); }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-xl ${expandedSubject === subject.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {expandedSubject === subject.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {expandedSubject === subject.id && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 space-y-3">
                   <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="Novo tópico..." className="flex-1 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none text-sm font-medium text-slate-900 dark:text-slate-100" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)} />
                      <button onClick={() => addTopic(subject.id)} className="bg-slate-800 dark:bg-slate-700 text-white px-6 rounded-xl font-bold text-sm">Add</button>
                   </div>
                   {subject.topics.map(topic => {
                     const acc = (topic.questionsAttempted || 0) > 0 ? Math.round((topic.questionsCorrect! / topic.questionsAttempted!) * 100) : 0;
                     return (
                        <div key={topic.id} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group transition-colors">
                          <div className="flex items-center gap-4">
                              <button onClick={() => setSubjects(subjects.map(s => s.id === subject.id ? { ...s, topics: s.topics.map(t => t.id === topic.id ? { ...t, completed: !t.completed, lastStudiedAt: !t.completed ? new Date().toISOString() : t.lastStudiedAt } : t) } : s))} className={`transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300'}`}>
                                <CheckCircle size={22} />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold truncate ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                                  {topic.questionsAttempted ? topic.questionsAttempted > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getAccuracyBg(acc)} ${getAccuracyColor(acc)}`}>
                                      <Trophy size={10} className="inline mr-1" /> {acc}% Acertos
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  {topic.studyTimeMinutes ? <span className="flex items-center gap-1"><Clock size={10} /> {Math.floor(topic.studyTimeMinutes / 60)}h {topic.studyTimeMinutes % 60}m</span> : null}
                                  {topic.questionsAttempted ? <span className="flex items-center gap-1"><Target size={10} /> {topic.questionsCorrect}/{topic.questionsAttempted} Q</span> : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setLoggingTopicId(topic.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Activity size={14} /></button>
                                <button onClick={() => setTopicToDelete({ subjectId: subject.id, topicId: topic.id, title: topic.title })} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 size={14} /></button>
                              </div>
                          </div>

                          {loggingTopicId === topic.id && (
                            <div className="mt-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-top-2 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Zap size={14} /> Registrar Performance</h4>
                                <button onClick={() => setLoggingTopicId(null)} className="text-slate-400"><X size={16} /></button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Horas</label><input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-white" value={logHours} onChange={(e) => setLogHours(e.target.value)} /></div>
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Minutos</label><input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-white" value={logMinutes} onChange={(e) => setLogMinutes(e.target.value)} /></div>
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Questões</label><input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-white" value={logAttempted} onChange={(e) => setLogAttempted(e.target.value)} /></div>
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Acertos</label><input type="number" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-white" value={logCorrect} onChange={(e) => setLogCorrect(e.target.value)} /></div>
                              </div>
                              <button onClick={() => handleSavePerformance(subject.id, topic.id)} className="mt-4 w-full bg-indigo-600 text-white font-black py-2 rounded-xl flex items-center justify-center gap-2"><Check size={16} /> CONFIRMAR</button>
                            </div>
                          )}
                        </div>
                     );
                   })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {subjectToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4">Excluir Disciplina?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Remover <strong>{subjectToDelete.name}</strong> permanentemente?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setSubjects(subjects.filter(s => s.id !== subjectToDelete.id)); setSubjectToDelete(null); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-xl">SIM, EXCLUIR</button>
              <button onClick={() => setSubjectToDelete(null)} className="w-full text-slate-500 font-bold py-4">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disciplinas;
