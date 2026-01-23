
import React, { useState, useCallback, useMemo } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { 
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Layers,
  BookOpen, TrendingUp, Save, Check, Database, Target, Clock, Calendar, Sparkles, X, 
  DownloadCloud, Search, AlertCircle
} from 'lucide-react';

interface DisciplinasProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string, date: string) => void;
}

const Disciplinas: React.FC<DisciplinasProps> = ({ subjects, setSubjects, predefinedEditais, onAddLog }) => {
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
      localStorage.setItem('sf_cache_subjects', JSON.stringify(next));
      return next;
    });

    if (supabase && !sId.startsWith('local-')) {
      setIsSyncing(sId);
      try { 
        await supabase.from('subjects').update({ topics: updatedTopics }).eq('id', sId);
      } catch (err: any) { 
        if (!isNetworkError(err)) console.error("Database Sync Failed:", err);
      } finally { setIsSyncing(null); }
    }
  }, [setSubjects]);

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;
    const tempId = `local-${Date.now()}`;
    const newSub: Subject = { id: tempId, name: newSubjectName.trim(), topics: [], color: colors[subjects.length % colors.length] };
    
    setSubjects(prev => [...prev, newSub]);
    setNewSubjectName('');

    if (supabase) {
      try {
        const { data } = await supabase.from('subjects').insert([{ name: newSub.name, topics: [] }]).select().single();
        if (data) setSubjects(prev => prev.map(s => s.id === tempId ? { ...s, id: String(data.id) } : s));
      } catch (e) {}
    }
  };

  const deleteSubject = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation(); // Evita expandir o card ao clicar no lixo
    if (!window.confirm("Deseja realmente excluir esta disciplina e todos os seus tópicos? Esta ação não pode ser desfeita.")) return;

    const sId = String(subjectId);
    setSubjects(prev => {
      const next = prev.filter(s => String(s.id) !== sId);
      localStorage.setItem('sf_cache_subjects', JSON.stringify(next));
      return next;
    });

    if (supabase && !sId.startsWith('local-') && !sId.startsWith('imported-')) {
      try {
        await supabase.from('subjects').delete().eq('id', sId);
      } catch (err) {
        console.error("Erro ao excluir disciplina do banco:", err);
      }
    }
  };

  const importFromCatalog = async (edital: PredefinedEdital) => {
    if (subjects.length > 0) {
      if (!window.confirm(`Você já possui ${subjects.length} disciplinas. Deseja adicionar as disciplinas de "${edital.name}" ao seu edital atual?`)) {
        return;
      }
    }

    const clonedSubjects: Subject[] = edital.subjects.map((sub, idx) => ({
      ...sub,
      id: `imported-${Date.now()}-${idx}`,
      topics: sub.topics.map(topic => ({
        ...topic,
        id: `topic-${Math.random().toString(36).substr(2, 9)}`,
        completed: false,
        studyTimeMinutes: 0,
        questionsAttempted: 0,
        questionsCorrect: 0,
        revisionsDone: []
      }))
    }));

    // Local Update
    const updatedSubjects = [...subjects, ...clonedSubjects];
    setSubjects(updatedSubjects);
    localStorage.setItem('sf_cache_subjects', JSON.stringify(updatedSubjects));
    setShowCatalog(false);

    // Sync with Cloud
    if (supabase) {
      for (const sub of clonedSubjects) {
        try {
          await supabase.from('subjects').insert([{ name: sub.name, topics: sub.topics, color: sub.color }]);
        } catch (e) {
          console.error("Erro ao sincronizar importação:", e);
        }
      }
    }
  };

  const toggleTopic = async (subId: string, topicId: string) => {
    const sub = subjects.find(s => String(s.id) === String(subId));
    if (!sub) return;
    const next = sub.topics.map(t => String(t.id) === String(topicId) ? { ...t, completed: !t.completed, lastStudiedAt: new Date().toISOString() } : t);
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

    if (totalMins > 0 || progAttempted > 0) {
      onAddLog(totalMins, topicId, subId, targetDate);
    }
    
    await handleSubjectUpdate(subId, next);
    setActiveProgressTopic(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">Matriz do Edital</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 text-xs uppercase tracking-[0.2em]">Verticalização Profissional de Tópicos</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCatalog(!showCatalog)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 ${showCatalog ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-900 text-indigo-600 border border-indigo-100 dark:border-slate-800'}`}
          >
            {showCatalog ? <X size={18} /> : <DownloadCloud size={18} />}
            {showCatalog ? 'Fechar Catálogo' : 'Carregar Catálogo'}
          </button>
          <div className="hidden md:flex gap-3">
            <input 
              type="text" 
              placeholder="Nova Disciplina..." 
              className="px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
              value={newSubjectName} 
              onChange={(e) => setNewSubjectName(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && addSubject()} 
            />
            <button onClick={addSubject} className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95">
              <Plus size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Catalog Selector Panel */}
      {showCatalog && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-top-6 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-600 animate-pulse" size={24} />
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Editais Disponíveis</h3>
            </div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Modelos fornecidos pelo Administrador</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predefinedEditais.map(edital => (
              <div 
                key={edital.id} 
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-white dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                <h4 className="font-black text-slate-900 dark:text-white mb-2">{edital.name}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">{edital.organization}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">{edital.subjects.length} Disciplinas</span>
                  <button 
                    onClick={() => importFromCatalog(edital)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                  >
                    <Plus size={14} /> Importar Matriz
                  </button>
                </div>
              </div>
            ))}
            {predefinedEditais.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 font-bold flex flex-col items-center gap-4 italic">
                <AlertCircle size={32} strokeWidth={1} />
                Nenhum edital cadastrado no catálogo mestre ainda.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {subjects.map(sub => {
          const total = sub.topics.length;
          const done = sub.topics.filter(t => t.completed).length;
          const isExp = expandedSubject === String(sub.id);
          const syncing = isSyncing === String(sub.id);

          return (
            <div key={sub.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-500 ${isExp ? 'ring-2 ring-indigo-500/20 shadow-2xl' : 'hover:shadow-lg'}`}>
              <div className="p-8 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(isExp ? null : String(sub.id))}>
                <div className="flex items-center gap-6">
                  <div className="w-4 h-12 rounded-full" style={{ backgroundColor: sub.color }} />
                  <div>
                    <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{sub.name}</h3>
                    <div className="flex items-center gap-4 mt-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{done} de {total} tópicos concluídos</p>
                      {syncing && <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 animate-pulse uppercase"><Sparkles size={10} /> Sincronizando</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => deleteSubject(e, String(sub.id))}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl transition-all"
                    title="Excluir Disciplina"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className={`p-3 rounded-2xl transition-all ${isExp ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                    {isExp ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                  </div>
                </div>
              </div>

              {isExp && (
                <div className="px-10 pb-10 pt-4 border-t border-slate-50 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex gap-3 mb-6">
                    <input 
                      type="text" 
                      placeholder="Adicionar tópico atômico..." 
                      className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-indigo-500 outline-none font-bold text-sm dark:text-white transition-all"
                      value={newTopicTitle} 
                      onChange={(e) => setNewTopicTitle(e.target.value)} 
                      onKeyPress={(e) => e.key === 'Enter' && (async () => {
                        const nt: Topic = { id: `topic-${Date.now()}`, title: newTopicTitle.trim(), completed: false, importance: 3, studyTimeMinutes: 0 };
                        await handleSubjectUpdate(String(sub.id), [...sub.topics, nt]);
                        setNewTopicTitle('');
                      })()} 
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {sub.topics.map(topic => {
                      const perc = topic.questionsAttempted ? Math.round(((topic.questionsCorrect || 0) / topic.questionsAttempted) * 100) : 0;
                      return (
                        <div key={topic.id} className="flex flex-col md:flex-row md:items-center gap-5 p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 transition-all">
                          <div className="flex items-start gap-4 flex-1">
                            <button onClick={() => toggleTopic(String(sub.id), topic.id)} className={`mt-1 transition-all ${topic.completed ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                              <CheckCircle size={24} strokeWidth={topic.completed ? 3 : 2} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-black block leading-tight ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-white'}`}>{topic.title}</span>
                              <div className="flex flex-wrap gap-3 mt-3">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm"><Clock size={10} className="text-indigo-500" /> {topic.studyTimeMinutes || 0}m</div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm"><Target size={10} className="text-rose-500" /> {topic.questionsAttempted || 0}Q</div>
                                {topic.questionsAttempted ? <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm border ${perc >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{perc}% APROV.</div> : null}
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-transparent"><Calendar size={10} /> {topic.lastStudiedAt ? new Date(topic.lastStudiedAt).toLocaleDateString() : 'NUNCA'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {
                              setActiveProgressTopic(topic.id);
                              setProgDate(topic.lastStudiedAt ? topic.lastStudiedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
                              setProgHours(0); setProgMinutes(0); setProgAttempted(0); setProgCorrect(0);
                            }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"><TrendingUp size={14} /> Registrar</button>
                            <button onClick={async () => {
                              const nt = sub.topics.filter(t => t.id !== topic.id);
                              await handleSubjectUpdate(String(sub.id), nt);
                            }} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {sub.topics.length === 0 && (
                    <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                      <p className="text-slate-300 dark:text-slate-600 font-black uppercase tracking-widest text-[10px]">Nenhum tópico cadastrado nesta matriz</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeProgressTopic && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
             <button onClick={() => setActiveProgressTopic(null)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 transition-colors">
               <X size={20} />
             </button>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <TrendingUp className="text-indigo-600" /> Consolidar Estudo
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Registrar sessão e métricas de desempenho</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} className="text-indigo-500" /> Data do Estudo
                </label>
                <input 
                  type="date" 
                  className="w-full px-5 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 font-black text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={progDate}
                  onChange={(e) => setProgDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas</label>
                  <input type="number" className="w-full px-5 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" value={progHours || ''} onChange={e => setProgHours(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minutos</label>
                  <input type="number" className="w-full px-5 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 font-black text-lg text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" value={progMinutes || ''} onChange={e => setProgMinutes(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Target size={12} /> Respondidas</label>
                  <input type="number" className="w-full px-5 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 font-black text-lg text-rose-500 outline-none focus:ring-2 focus:ring-rose-500" value={progAttempted || ''} onChange={e => setProgAttempted(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Check size={12} /> Acertos</label>
                  <input type="number" className="w-full px-5 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-950 font-black text-lg text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500" value={progCorrect || ''} onChange={e => setProgCorrect(parseInt(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>
            </div>
            
            <div className="mt-12">
              <button onClick={() => {
                const sId = subjects.find(s => s.topics.some(t => t.id === activeProgressTopic))?.id;
                if(sId) saveTopicProgress(sId, activeProgressTopic);
              }} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-indigo-700 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 active:scale-95">
                <Save size={18} /> Salvar Registro Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disciplinas;
