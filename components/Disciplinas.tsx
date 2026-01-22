
import React, { useState, useEffect } from 'react';
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
  Zap,
  Target,
  Trophy,
  Activity
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
  
  // Log inputs
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

  const importFromCatalog = (edital: PredefinedEdital) => {
    setSubjects([...subjects, ...edital.subjects]);
    setIsCatalogOpen(false);
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

  const handleBulkImport = () => {
    if (!bulkText.trim() || !activeSubjectForBulk) return;
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const newTopics: Topic[] = lines.map(line => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: line.trim(),
      completed: false,
      importance: 3,
      studyTimeMinutes: 0,
      questionsAttempted: 0,
      questionsCorrect: 0
    }));

    setSubjects(subjects.map(s => s.id === activeSubjectForBulk ? { ...s, topics: [...s.topics, ...newTopics] } : s));
    setBulkText('');
    setIsBulkModalOpen(false);
    setActiveSubjectForBulk(null);
  };

  const toggleTopic = (subjectId: string, topicId: string) => {
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.map(t => t.id === topicId ? { 
        ...t, 
        completed: !t.completed, 
        lastStudiedAt: !t.completed ? new Date().toISOString() : t.lastStudiedAt 
      } : t)
    } : s));
  };

  const saveSubjectEdit = () => {
    if (!editValue.trim() || !editingSubjectId) return;
    setSubjects(subjects.map(s => s.id === editingSubjectId ? { ...s, name: editValue } : s));
    setEditingSubjectId(null);
    setEditValue('');
  };

  const saveTopicEdit = (subjectId: string) => {
    if (!editValue.trim() || !editingTopicId) return;
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      topics: s.topics.map(t => t.id === editingTopicId ? { ...t, title: editValue } : t)
    } : s));
    setEditingTopicId(null);
    setEditValue('');
  };

  const handleSavePerformance = (subjectId: string, topicId: string) => {
    const totalMinutes = (parseInt(logHours) * 60) + parseInt(logMinutes);
    const attempted = parseInt(logAttempted);
    const correct = parseInt(logCorrect);

    if (totalMinutes < 0) return;

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
    resetPerformanceInputs();
  };

  const resetPerformanceInputs = () => {
    setLogHours('1');
    setLogMinutes('0');
    setLogAttempted('0');
    setLogCorrect('0');
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
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Registre seu desempenho e controle o domínio de cada tópico.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCatalogOpen(true)}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
          >
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
          <button 
            onClick={addSubject}
            className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shrink-0"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {subjects.map(subject => {
          const totalT = subject.topics.length;
          const completedT = subject.topics.filter(t => t.completed).length;
          
          return (
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  {editingSubjectId === subject.id ? (
                    <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text"
                        className="flex-1 px-4 py-1 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-950 font-bold outline-none text-slate-900 dark:text-slate-100"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveSubjectEdit()}
                      />
                      <button onClick={saveSubjectEdit} className="p-2 bg-emerald-500 text-white rounded-lg"><Check size={18}/></button>
                      <button onClick={() => setEditingSubjectId(null)} className="p-2 bg-slate-400 text-white rounded-lg"><X size={18}/></button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{subject.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{completedT} / {totalT} tópicos concluídos</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {editingSubjectId !== subject.id && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingSubjectId(subject.id); setEditValue(subject.name); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-600 hover:text-white transition-all" title="Editar Nome">
                      <Edit3 size={18} />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setActiveSubjectForBulk(subject.id); setIsBulkModalOpen(true); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-xl hover:bg-amber-600 hover:text-white transition-all" title="Importar em Massa">
                    <Layers size={18} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setSubjectToDelete(subject); }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all" title="Excluir Disciplina">
                    <Trash2 size={18} />
                  </button>
                  <div className={`p-2 rounded-xl ${expandedSubject === subject.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {expandedSubject === subject.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {expandedSubject === subject.id && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 space-y-3">
                   <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Novo tópico..."
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors"
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)}
                      />
                      <button onClick={() => addTopic(subject.id)} className="bg-slate-800 dark:bg-slate-700 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all">Add</button>
                   </div>
                   {subject.topics.map(topic => {
                     const accuracy = topic.questionsAttempted && topic.questionsAttempted > 0 
                        ? Math.round((topic.questionsCorrect! / topic.questionsAttempted) * 100) 
                        : 0;

                     return (
                        <div key={topic.id} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group transition-colors">
                          <div className="flex items-center gap-4">
                              <button onClick={() => toggleTopic(subject.id, topic.id)} className={`transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300'}`}>
                                <CheckCircle size={22} />
                              </button>
                              
                              {editingTopicId === topic.id ? (
                                <div className="flex-1 flex gap-2">
                                  <input 
                                    type="text"
                                    className="flex-1 px-3 py-1 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors"
                                    value={editValue}
                                    autoFocus
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && saveTopicEdit(subject.id)}
                                  />
                                  <button onClick={() => saveTopicEdit(subject.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg"><Check size={14}/></button>
                                  <button onClick={() => setEditingTopicId(null)} className="p-1.5 bg-slate-400 text-white rounded-lg"><X size={14}/></button>
                                </div>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold block truncate ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                                    {topic.questionsAttempted ? topic.questionsAttempted > 0 && (
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${getAccuracyBg(accuracy)} ${getAccuracyColor(accuracy)}`}>
                                        <Trophy size={10} /> {accuracy}% Acertos
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    {topic.studyTimeMinutes ? (
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                        <Clock size={10} /> {Math.floor(topic.studyTimeMinutes / 60)}h {topic.studyTimeMinutes % 60}m acumulados
                                      </span>
                                    ) : null}
                                    {topic.questionsAttempted ? topic.questionsAttempted > 0 && (
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                          <Target size={10} /> {topic.questionsCorrect} / {topic.questionsAttempted} Questões
                                       </span>
                                    ) : null}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {editingTopicId !== topic.id && loggingTopicId !== topic.id && (
                                  <>
                                    <button onClick={() => { setLoggingTopicId(topic.id); resetPerformanceInputs(); }} className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Registrar Performance">
                                      <Activity size={14} />
                                    </button>
                                    <button onClick={() => { setEditingTopicId(topic.id); setEditValue(topic.title); }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all" title="Editar Tópico">
                                      <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => setTopicToDelete({ subjectId: subject.id, topicId: topic.id, title: topic.title })} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title="Excluir Tópico">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                          </div>

                          {loggingTopicId === topic.id && (
                            <div className="mt-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-top-2 shadow-sm transition-colors">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                  <Zap size={14} /> Registro de Desempenho
                                </h4>
                                <button onClick={() => setLoggingTopicId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">Horas</label>
                                  <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                    value={logHours}
                                    onChange={(e) => setLogHours(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">Minutos</label>
                                  <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                    value={logMinutes}
                                    onChange={(e) => setLogMinutes(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">Questões</label>
                                  <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                    value={logAttempted}
                                    onChange={(e) => setLogAttempted(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">Acertos</label>
                                  <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                    value={logCorrect}
                                    onChange={(e) => setLogCorrect(e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-3">
                                  {parseInt(logAttempted) > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getAccuracyBg(Math.round((parseInt(logCorrect) / parseInt(logAttempted)) * 100))} ${getAccuracyColor(Math.round((parseInt(logCorrect) / parseInt(logAttempted)) * 100))}`}>
                                        Aproveitamento: {Math.round((parseInt(logCorrect) / parseInt(logAttempted)) * 100)}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button 
                                  onClick={() => handleSavePerformance(subject.id, topic.id)}
                                  className="px-6 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                                >
                                  <Check size={16} /> CONFIRMAR REGISTRO
                                </button>
                              </div>
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
        {subjects.length === 0 && (
           <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
              <BookOpen className="mx-auto mb-4 text-slate-300" size={48} />
              <p className="text-slate-400 font-bold">Inicie sua jornada cadastrando ou importando um edital.</p>
           </div>
        )}
      </div>

      {/* Modal: Catálogo de Editais */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-10">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <Database size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Catálogo Global</h3>
                      <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Importe o conteúdo completo com um clique</p>
                    </div>
                  </div>
                  <button onClick={() => setIsCatalogOpen(false)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  {predefinedEditais.map(edital => (
                    <div key={edital.id} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-transparent hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 transition-all group flex flex-col h-full shadow-sm hover:shadow-xl">
                       <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">{edital.name}</h4>
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">{edital.organization}</p>
                       <div className="flex-1 space-y-3">
                          <p className="text-sm text-slate-500 font-medium">Contém <span className="text-slate-900 dark:text-slate-200 font-bold">{edital.subjects.length} disciplinas</span> organizadas.</p>
                       </div>
                       <button 
                         onClick={() => importFromCatalog(edital)}
                         className="mt-6 w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 group-hover:bg-indigo-600 transition-colors"
                       >
                         IMPORTAR AGORA <ArrowRight size={18} />
                       </button>
                    </div>
                  ))}
                  {predefinedEditais.length === 0 && (
                    <div className="col-span-2 py-20 text-center opacity-30">
                       <Database className="mx-auto mb-4" size={48} />
                       <p className="font-bold italic">Nenhum edital modelo disponível no servidor.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 shadow-2xl">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Importação em Massa</h3>
                  <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={24}/></button>
               </div>
               <textarea 
                  className="w-full h-64 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" 
                  placeholder="Cole os tópicos linha por linha..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
               />
               <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                  <button onClick={handleBulkImport} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">IMPORTAR</button>
               </div>
            </div>
         </div>
      )}

      {/* Delete Subject Confirm */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4 transition-colors">Excluir Disciplina?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium transition-colors">Isso removerá <strong>{subjectToDelete.name}</strong> e todos os seus tópicos permanentemente.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { setSubjects(subjects.filter(s => s.id !== subjectToDelete.id)); setSubjectToDelete(null); }}
                className="w-full bg-rose-500 text-white font-black py-4 rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
              >
                SIM, EXCLUIR
              </button>
              <button onClick={() => setSubjectToDelete(null)} className="w-full text-slate-500 font-bold py-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Topic Confirm */}
      {topicToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 transition-colors">Excluir Tópico?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium transition-colors">Remover: "{topicToDelete.title}"?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setSubjects(subjects.map(s => s.id === topicToDelete.subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicToDelete.topicId) } : s));
                  setTopicToDelete(null);
                }}
                className="w-full bg-rose-500 text-white font-black py-3 rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
              >
                EXCLUIR TÓPICO
              </button>
              <button onClick={() => setTopicToDelete(null)} className="w-full text-slate-500 font-bold py-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disciplinas;
