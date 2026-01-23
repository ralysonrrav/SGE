
import React, { useState, useCallback } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, X, Layers,
  BookOpen, TrendingUp, Save, Check, Database, ArrowRight, Target, Clock, Calendar, BarChart2
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
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [activeSubjectForBulk, setActiveSubjectForBulk] = useState<string | null>(null);
  
  const [activeProgressTopic, setActiveProgressTopic] = useState<string | null>(null);
  const [progDate, setProgDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [progHours, setProgHours] = useState<number>(0);
  const [progMinutes, setProgMinutes] = useState<number>(0);
  const [progAttempted, setProgAttempted] = useState<number>(0);
  const [progCorrect, setProgCorrect] = useState<number>(0);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const handleSubjectUpdate = useCallback(async (subjectId: string, updatedTopics: Topic[]) => {
    const sId = String(subjectId);
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { ...s, topics: updatedTopics } : s));
    if (supabase && !sId.startsWith('local-')) {
      try { await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', sId); } catch (err) { console.error(err); }
    }
  }, [setSubjects]);

  const addSubject = async (name: string, topics: Topic[] = []) => {
    if (!name.trim()) return;
    let finalId = `local-${Date.now()}`;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('subjects').insert([{ name: name.trim(), topics }]).select().single();
        if (!error && data) finalId = String(data.id);
      }
    } finally {
      setSubjects(prev => [...prev, { id: finalId, name: name.trim(), topics, color: colors[prev.length % colors.length] }]);
      setNewSubjectName('');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta disciplina?")) return;
    setSubjects(prev => prev.filter(s => String(s.id) !== String(id)));
    if (supabase && !String(id).startsWith('local-')) {
      await supabase.from('subjects').delete().eq('id', id);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim() || !activeSubjectForBulk) return;
    const subject = subjects.find(s => String(s.id) === String(activeSubjectForBulk));
    if (!subject) return;

    const newTopics: Topic[] = bulkText.split('\n').filter(l => l.trim()).map(line => ({
      id: `topic-${Math.random().toString(36).substr(2, 9)}`,
      title: line.trim(),
      completed: false,
      importance: 3,
      studyTimeMinutes: 0
    }));

    await handleSubjectUpdate(subject.id, [...subject.topics, ...newTopics]);
    setBulkText('');
    setIsBulkModalOpen(false);
  };

  const toggleTopic = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    const updatedTopics = subject.topics.map(t => String(t.id) === String(topicId) ? { ...t, completed: !t.completed, lastStudiedAt: !t.completed ? new Date().toISOString() : t.lastStudiedAt } : t);
    await handleSubjectUpdate(subject.id, updatedTopics);
  };

  const saveTopicProgress = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    const totalMinutes = (progHours * 60) + (progMinutes || 0);
    const updatedTopics = subject.topics.map(t => String(t.id) === String(topicId) ? {
      ...t,
      studyTimeMinutes: (t.studyTimeMinutes || 0) + totalMinutes,
      questionsAttempted: (t.questionsAttempted || 0) + progAttempted,
      questionsCorrect: (t.questionsCorrect || 0) + progCorrect,
      lastStudiedAt: new Date(progDate).toISOString()
    } : t);

    if (totalMinutes > 0) onAddLog(totalMinutes, topicId, String(subjectId));
    await handleSubjectUpdate(subjectId, updatedTopics);
    setActiveProgressTopic(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Edital Verticalizado</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle total sobre seu conteúdo programático.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatalogOpen(true)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all"><Database size={16} /> CATÁLOGO</button>
          <input type="text" placeholder="Nova disciplina..." className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none w-48 text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-bold" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addSubject(newSubjectName)} />
          <button onClick={() => addSubject(newSubjectName)} className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg"><Plus size={24} /></button>
        </div>
      </header>

      <div className="space-y-4">
        {subjects.map(subject => {
          const totalT = subject.topics.length;
          const completedT = subject.topics.filter(t => t.completed).length;
          const isExpanded = expandedSubject === String(subject.id);
          return (
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(isExpanded ? null : String(subject.id))}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{subject.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{completedT} / {totalT} tópicos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); setActiveSubjectForBulk(String(subject.id)); setIsBulkModalOpen(true); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Layers size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSubject(String(subject.id)); }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 space-y-3">
                   <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="Novo tópico..." className="flex-1 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none text-sm dark:text-white" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (async () => {
                         const n = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3 };
                         await handleSubjectUpdate(subject.id, [...subject.topics, n]);
                         setNewTopicTitle('');
                      })()} />
                   </div>
                   {subject.topics.map(topic => {
                     const hitRate = topic.questionsAttempted && topic.questionsAttempted > 0 
                      ? Math.round(((topic.questionsCorrect || 0) / topic.questionsAttempted) * 100) 
                      : 0;

                     return (
                       <div key={topic.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group transition-all hover:bg-white dark:hover:bg-slate-800">
                         <div className="flex items-start gap-4 flex-1 min-w-0">
                           <button onClick={() => toggleTopic(String(subject.id), topic.id)} className={`mt-1 transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300'}`}><CheckCircle size={22} /></button>
                           <div className="min-w-0 flex-1">
                             <span className={`text-sm font-bold block ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-white'}`}>{topic.title}</span>
                             
                             {/* Topic Stats Row */}
                             {(topic.lastStudiedAt || (topic.studyTimeMinutes && topic.studyTimeMinutes > 0) || (topic.questionsAttempted && topic.questionsAttempted > 0)) && (
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                 {topic.lastStudiedAt && (
                                   <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                     <Calendar size={10} className="text-indigo-400" />
                                     {new Date(topic.lastStudiedAt).toLocaleDateString()}
                                   </div>
                                 )}
                                 {topic.studyTimeMinutes && topic.studyTimeMinutes > 0 && (
                                   <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                     <Clock size={10} className="text-amber-400" />
                                     {Math.floor(topic.studyTimeMinutes / 60)}h{topic.studyTimeMinutes % 60}m
                                   </div>
                                 )}
                                 {topic.questionsAttempted && topic.questionsAttempted > 0 && (
                                   <>
                                     <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                       <Target size={10} className="text-rose-400" />
                                       {topic.questionsAttempted} Q
                                     </div>
                                     <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                       <Check size={10} className="text-emerald-400" />
                                       {topic.questionsCorrect} A
                                     </div>
                                     <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shadow-sm border ${
                                       hitRate >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                       hitRate >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                     }`}>
                                       {hitRate}%
                                     </div>
                                   </>
                                 )}
                               </div>
                             )}
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-end md:self-center">
                           <button onClick={() => { 
                             setActiveProgressTopic(topic.id); 
                             setProgDate(topic.lastStudiedAt ? topic.lastStudiedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
                             setProgHours(0); 
                             setProgMinutes(0);
                             setProgAttempted(0);
                             setProgCorrect(0);
                           }} className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-500 rounded-lg text-[10px] font-black border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all shadow-sm flex items-center gap-2"><TrendingUp size={14} /> REGISTRAR</button>
                           <button onClick={async () => await handleSubjectUpdate(subject.id, subject.topics.filter(t => t.id !== topic.id))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                         </div>
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><TrendingUp size={24} /></div>
              <h3 className="text-xl font-black dark:text-white">Registrar Estudo</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data da Sessão</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Horas</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progHours || ''} onChange={(e) => setProgHours(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Minutos</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progMinutes || ''} onChange={(e) => setProgMinutes(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Q. Feitas</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progAttempted || ''} onChange={(e) => setProgAttempted(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Q. Acertos</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progCorrect || ''} onChange={(e) => setProgCorrect(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => {
                const subId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id;
                if(subId) saveTopicProgress(subId, activeProgressTopic);
              }} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> SALVAR DADOS
              </button>
              <button onClick={() => setActiveProgressTopic(null)} className="flex-1 text-slate-500 font-bold py-4 hover:bg-slate-100 rounded-2xl transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Layers size={24} /></div>
                  <h3 className="text-xl font-black dark:text-white">Importação em Massa</h3>
               </div>
               <textarea className="w-full h-64 p-5 rounded-2xl border-2 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="Cole os tópicos linha por linha..." value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
               <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                  <button onClick={handleBulkImport} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all">IMPORTAR TÓPICOS</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Disciplinas;
