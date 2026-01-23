
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
      try { 
        const { error } = await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', sId);
        if (error) throw error;
      } catch (err) { 
        console.error("Erro ao sincronizar com Supabase:", err);
      }
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
    const updatedTopics = subject.topics.map(t => {
      if (String(t.id) === String(topicId)) {
        const isFinishing = !t.completed;
        // Requisito: Se clicar em concluir, usar a data registrada (lastStudiedAt) se existir, senão a atual.
        const targetDate = t.lastStudiedAt || new Date().toISOString();
        return { 
          ...t, 
          completed: isFinishing, 
          lastStudiedAt: targetDate, // Mantém data do registro manual
          concludedAt: isFinishing ? targetDate : t.concludedAt
        };
      }
      return t;
    });
    await handleSubjectUpdate(subject.id, updatedTopics);
  };

  const saveTopicProgress = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    const totalMinutes = (progHours * 60) + (progMinutes || 0);
    
    // Requisito: Os dados NÃO serão acumuláveis. Cada registro substitui o estado atual do tópico.
    const updatedTopics = subject.topics.map(t => String(t.id) === String(topicId) ? {
      ...t,
      studyTimeMinutes: totalMinutes, // Substitui em vez de somar
      questionsAttempted: progAttempted, // Substitui
      questionsCorrect: progCorrect, // Substitui
      lastStudiedAt: new Date(`${progDate}T12:00:00`).toISOString()
    } : t);

    if (totalMinutes > 0) onAddLog(totalMinutes, topicId, String(subjectId));
    await handleSubjectUpdate(subjectId, updatedTopics);
    setActiveProgressTopic(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Edital Verticalizado</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Arquitetura de dados integrada ao Supabase.</p>
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
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(isExpanded ? null : String(subject.id))}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{subject.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{completedT} / {totalT} tópicos concluídos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); setActiveSubjectForBulk(String(subject.id)); setIsBulkModalOpen(true); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Layers size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSubject(String(subject.id)); }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-300">
                   <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="Adicionar tópico manual..." className="flex-1 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none text-sm dark:text-white font-medium" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (async () => {
                         const n = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3, studyTimeMinutes: 0 };
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
                           <button onClick={() => toggleTopic(String(subject.id), topic.id)} className={`mt-1 transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}>
                             <CheckCircle size={22} />
                           </button>
                           <div className="min-w-0 flex-1">
                             <span className={`text-sm font-bold block leading-tight ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-white'}`}>{topic.title}</span>
                             
                             {/* --- REQUISITO: VISUALIZAÇÃO RÁPIDA DE DADOS --- */}
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                 <Calendar size={10} className="text-indigo-500" />
                                 {topic.lastStudiedAt ? new Date(topic.lastStudiedAt).toLocaleDateString() : 'SEM REGISTRO'}
                               </div>
                               
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                 <Clock size={10} className="text-amber-500" />
                                 {topic.studyTimeMinutes ? `${Math.floor(topic.studyTimeMinutes / 60)}h${topic.studyTimeMinutes % 60}m` : '0m'}
                               </div>

                               <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                 <Target size={10} className="text-rose-500" />
                                 {topic.questionsAttempted || 0}Q / <Check size={10} className="text-emerald-500 inline" /> {topic.questionsCorrect || 0}A
                               </div>

                               <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm border ${
                                 hitRate >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10' : 
                                 hitRate >= 60 ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/10'
                               }`}>
                                 {hitRate}% APROVEIT.
                               </div>
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-end md:self-center">
                           <button onClick={() => { 
                             setActiveProgressTopic(topic.id); 
                             setProgDate(topic.lastStudiedAt ? topic.lastStudiedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
                             setProgHours(Math.floor((topic.studyTimeMinutes || 0) / 60)); 
                             setProgMinutes((topic.studyTimeMinutes || 0) % 60);
                             setProgAttempted(topic.questionsAttempted || 0);
                             setProgCorrect(topic.questionsCorrect || 0);
                           }} className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-500 rounded-lg text-[10px] font-black border border-slate-100 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2 uppercase"><TrendingUp size={14} /> Registrar</button>
                           <button onClick={async () => await handleSubjectUpdate(subject.id, subject.topics.filter(t => t.id !== topic.id))} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"><Trash2 size={16} /></button>
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

      {/* --- MODAL DE REGISTRO PROFISSIONAL --- */}
      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><TrendingUp size={24} /></div>
              <div>
                <h3 className="text-xl font-black dark:text-white leading-none">Registrar Estudo</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dados não-acumulativos</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Data da Sessão</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><Clock size={10}/> Horas</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progHours || ''} onChange={(e) => setProgHours(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Minutos</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progMinutes || ''} onChange={(e) => setProgMinutes(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><Target size={10}/> Q. Feitas</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progAttempted || ''} onChange={(e) => setProgAttempted(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1"><Check size={10}/> Q. Acertos</label>
                  <input type="number" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={progCorrect || ''} onChange={(e) => setProgCorrect(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="mt-10 flex gap-3">
              <button onClick={() => {
                const subId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id;
                if(subId) saveTopicProgress(subId, activeProgressTopic);
              }} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> ATUALIZAR STATUS
              </button>
              <button onClick={() => setActiveProgressTopic(null)} className="flex-1 text-slate-500 font-bold py-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">FECHAR</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE IMPORTAÇÃO EM MASSA --- */}
      {isBulkModalOpen && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Layers size={24} /></div>
                  <h3 className="text-xl font-black dark:text-white">Importação Massiva</h3>
               </div>
               <textarea className="w-full h-64 p-5 rounded-2xl border-2 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="Cole os tópicos linha por linha do seu edital..." value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
               <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsBulkModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Descartar</button>
                  <button onClick={handleBulkImport} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all">SALVAR TÓPICOS</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Disciplinas;
