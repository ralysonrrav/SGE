
import React, { useState, useCallback } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  X, 
  Layers,
  Loader2,
  BookOpen,
  TrendingUp,
  Save,
  Check,
  AlertCircle,
  CheckCircle,
  CloudOff,
  CloudCheck
} from 'lucide-react';

interface DisciplinasProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string) => void;
}

const Disciplinas: React.FC<DisciplinasProps> = ({ subjects, setSubjects, predefinedEditais, onAddLog }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  
  // Performance logging states
  const [activeProgressTopic, setActiveProgressTopic] = useState<string | null>(null);
  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const handleSubjectUpdate = useCallback(async (subjectId: string, updatedTopics: Topic[]) => {
    const sId = String(subjectId);
    
    // Atualização Otimista
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { ...s, topics: updatedTopics } : s));

    if (supabase && !sId.startsWith('local-')) {
      try {
        const { error } = await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', sId);
        if (error) throw error;
        setIsOfflineMode(false);
      } catch (err: any) {
        if (isNetworkError(err)) {
          setIsOfflineMode(true);
        } else {
          console.warn("Falha na sincronização (salvo localmente):", err.message);
        }
      }
    }
  }, [setSubjects]);

  const addSubject = async (name: string, topics: Topic[] = []) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    setLoading(true);
    let finalId = `local-${Date.now()}`;

    try {
      if (supabase && navigator.onLine) {
        const { data, error } = await supabase.from('subjects').insert([{ name: trimmedName, topics }]).select().single();
        if (error) throw error;
        if (data) {
          finalId = String(data.id);
          setIsOfflineMode(false);
        }
      }
    } catch (err: any) {
      setIsOfflineMode(true);
      // Silencioso: Fallback local já definido acima
    } finally {
      setSubjects(prev => [...prev, { 
        id: finalId, 
        name: trimmedName, 
        topics, 
        color: colors[prev.length % colors.length] 
      }]);
      setNewSubjectName('');
      setLoading(false);
    }
  };

  const deleteSubject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente excluir esta disciplina?")) return;
    const idToDelete = String(id);
    
    setSubjects(prev => prev.filter(s => String(s.id) !== idToDelete));
    if (expandedSubject === idToDelete) setExpandedSubject(null);
    
    if (supabase && !idToDelete.startsWith('local-')) {
      try { 
        await supabase.from('subjects').delete().eq('id', idToDelete); 
        setIsOfflineMode(false);
      } catch (err) { 
        if (isNetworkError(err)) setIsOfflineMode(true);
      }
    }
  };

  const openProgressForm = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation();
    setActiveProgressTopic(topic.id);
    const initialDate = topic.lastStudiedAt || topic.concludedAt || new Date().toISOString();
    setProgDate(initialDate.split('T')[0]);
    setProgHours(Math.floor((topic.studyTimeMinutes || 0) / 60));
    setProgMinutes((topic.studyTimeMinutes || 0) % 60);
    setProgAttempted(topic.questionsAttempted || 0);
    setProgCorrect(topic.questionsCorrect || 0);
  };

  const saveTopicProgress = async (subjectId: string, topicId: string) => {
    const sId = String(subjectId);
    const tId = String(topicId);
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;

    const newIsoDate = new Date(`${progDate}T12:00:00`).toISOString();
    const totalMinutes = (progHours * 60) + progMinutes;

    const updatedTopics = subject.topics.map(t => {
      if (String(t.id) === tId) {
        return {
          ...t,
          studyTimeMinutes: totalMinutes,
          questionsAttempted: progAttempted,
          questionsCorrect: progCorrect,
          lastStudiedAt: newIsoDate,
          concludedAt: t.completed ? newIsoDate : t.concludedAt
        };
      }
      return t;
    });

    await handleSubjectUpdate(sId, updatedTopics);
    setActiveProgressTopic(null);
  };

  const toggleTopic = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    
    const updatedTopics = subject.topics.map(t => {
      if (String(t.id) === String(topicId)) {
        const isFinishing = !t.completed;
        const now = new Date().toISOString();
        return { 
          ...t, 
          completed: isFinishing, 
          concludedAt: isFinishing ? now : t.concludedAt,
          lastStudiedAt: isFinishing ? now : t.lastStudiedAt 
        };
      }
      return t;
    });

    await handleSubjectUpdate(subject.id, updatedTopics);
  };

  const addTopic = async (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;

    const newTopic: Topic = { 
      id: `topic-${Math.random().toString(36).substr(2, 9)}`, 
      title: newTopicTitle.trim(), 
      completed: false, 
      importance: 3,
      studyTimeMinutes: 0,
      questionsAttempted: 0,
      questionsCorrect: 0
    };

    const updatedTopics = [...subject.topics, newTopic];
    await handleSubjectUpdate(subject.id, updatedTopics);
    setNewTopicTitle('');
  };

  const deleteTopic = async (e: React.MouseEvent, subjectId: string, topicId: string) => {
    e.stopPropagation();
    if (!window.confirm("Remover este tópico?")) return;
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;

    const updatedTopics = subject.topics.filter(t => String(t.id) !== String(topicId));
    await handleSubjectUpdate(subject.id, updatedTopics);
  };

  const importEdital = async (edital: PredefinedEdital) => {
    if (!window.confirm(`Importar o edital "${edital.name}"?`)) return;
    setLoading(true);
    try {
      for (const subject of edital.subjects) {
        const topicsWithCleanIds = subject.topics.map(t => ({
          ...t,
          id: `topic-${Math.random().toString(36).substr(2, 9)}`,
          completed: false,
          studyTimeMinutes: 0,
          questionsAttempted: 0,
          questionsCorrect: 0
        }));
        await addSubject(subject.name, topicsWithCleanIds);
      }
      setIsCatalogOpen(false);
    } catch (err) {
      console.error("Erro ao importar edital:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Suas Disciplinas</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 dark:text-slate-400 font-medium">Controle de conteúdo programático.</p>
            {isOfflineMode ? (
              <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-800/50">
                <CloudOff size={12} /> Somente Local
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                <CloudCheck size={12} /> Sincronizado
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => setIsCatalogOpen(true)}
          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-black border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <Layers size={20} />
          Catálogo de Editais
        </button>
      </header>

      {/* New Subject Input */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
        <div className="pl-4 text-slate-400"><BookOpen size={20} /></div>
        <input 
          type="text" 
          placeholder="Nome da nova disciplina..."
          className="flex-1 py-4 bg-transparent outline-none font-bold text-slate-700 dark:text-slate-200"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSubject(newSubjectName)}
        />
        <button 
          onClick={() => addSubject(newSubjectName)}
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          Adicionar
        </button>
      </div>

      {/* Catalog Modal */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsCatalogOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Catálogo</h3>
              <button onClick={() => setIsCatalogOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {predefinedEditais.map(edital => (
                <div key={edital.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-all group">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-slate-100">{edital.name}</h4>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{edital.organization}</p>
                  </div>
                  <button onClick={() => importEdital(edital)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">Importar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 gap-6">
        {subjects.map(subject => {
          const isExpanded = expandedSubject === String(subject.id);
          const isLocal = String(subject.id).startsWith('local-');
          
          return (
            <div key={subject.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border shadow-sm overflow-hidden transition-all group/card ${isExpanded ? 'border-indigo-100 dark:border-indigo-900/30 ring-1 ring-indigo-50 dark:ring-indigo-950' : 'border-slate-100 dark:border-slate-800'}`}>
              <div 
                className="p-8 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedSubject(isExpanded ? null : String(subject.id))}
              >
                <div className="flex items-center gap-6">
                  <div className="w-2 h-12 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{subject.name}</h3>
                      {isLocal && <div className="p-1 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full" title="Salvo Localmente"><AlertCircle size={14} /></div>}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {subject.topics.filter(t => t.completed).length} / {subject.topics.length} Concluídos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => deleteSubject(e, String(subject.id))}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/card:opacity-100"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}>
                    <ChevronDown size={24} />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Novo tópico para esta disciplina..."
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 outline-none font-bold text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTopic(subject.id)}
                    />
                    <button onClick={() => addTopic(subject.id)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"><Plus size={20} /></button>
                  </div>

                  <div className="space-y-3">
                    {subject.topics.map(topic => (
                      <div key={topic.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 group/topic transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-center gap-4 flex-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTopic(subject.id, topic.id); }}
                            className={`p-2 rounded-xl transition-all ${topic.completed ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'}`}
                          >
                            <CheckCircle size={20} />
                          </button>
                          <div className="min-w-0">
                            <p className={`font-bold text-sm truncate ${topic.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</p>
                            {(topic.lastStudiedAt || topic.concludedAt) && (
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight flex items-center gap-1 mt-0.5">
                                <Check size={10} /> Último estudo: {new Date(topic.lastStudiedAt || topic.concludedAt!).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                          <button 
                            onClick={(e) => openProgressForm(e, topic)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm"
                          >
                            <TrendingUp size={14} /> Registrar Desempenho
                          </button>
                          <button 
                            onClick={(e) => deleteTopic(e, subject.id, topic.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover/topic:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {activeProgressTopic === topic.id && (
                          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveProgressTopic(null)}>
                            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Registrar Estudo</h3>
                                <button onClick={() => setActiveProgressTopic(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                              </div>
                              <div className="space-y-5">
                                <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Data do Estudo</label>
                                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Tempo (Horas)</label>
                                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progHours || ''} onChange={(e) => setProgHours(parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Minutos</label>
                                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progMinutes || ''} onChange={(e) => setProgMinutes(parseInt(e.target.value) || 0)} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Total Questões</label>
                                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progAttempted || ''} onChange={(e) => setProgAttempted(parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Acertos</label>
                                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={progCorrect || ''} onChange={(e) => setProgCorrect(parseInt(e.target.value) || 0)} />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-8 flex gap-3">
                                <button onClick={() => saveTopicProgress(subject.id, topic.id)} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                  <Save size={18} /> SALVAR
                                </button>
                                <button onClick={() => setActiveProgressTopic(null)} className="flex-1 text-slate-500 font-bold py-4 hover:bg-slate-100 rounded-2xl transition-all">CANCELAR</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Disciplinas;
