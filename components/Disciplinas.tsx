
import React, { useState } from 'react';
import { Subject, Topic, PredefinedEdital, User } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, X, Layers, ArrowRight, Loader2, BookOpen } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

interface DisciplinasProps {
  user: User;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  predefinedEditais: PredefinedEdital[];
  onAddLog: (minutes: number, topicId: string, subjectId: string) => void;
}

const Disciplinas: React.FC<DisciplinasProps> = ({ user, subjects, setSubjects, predefinedEditais, onAddLog }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const addSubject = async (name: string, topics: Topic[] = []) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (supabase) {
        console.debug("Tentando cadastrar disciplina para usuário:", user.id);
        
        const { data, error } = await supabase
          .from('subjects')
          .insert([{ 
            name: name.trim(), 
            topics: topics, 
            user_id: user.id 
          }])
          .select()
          .single();

        if (error) {
          console.error("Erro Supabase:", error);
          if (error.code === '42703') {
            alert("Erro de Banco de Dados: A coluna 'user_id' não foi encontrada na tabela 'subjects'. Por favor, execute o script SQL de atualização fornecido.");
          } else {
            alert(`Falha ao cadastrar matéria: ${error.message}`);
          }
          return;
        }

        if (data) {
          setSubjects(prev => [...prev, { 
            ...data, 
            id: String(data.id), 
            color: COLORS[prev.length % COLORS.length] 
          }]);
          setNewSubjectName('');
        }
      } else {
        // Fallback para modo offline se o Supabase estiver quebrado
        setSubjects(prev => [...prev, { 
          id: Date.now().toString(), 
          name: name.trim(), 
          topics, 
          color: COLORS[prev.length % COLORS.length] 
        }]);
        setNewSubjectName('');
      }
    } catch (err: any) {
      console.error("Erro inesperado no cadastro:", err);
      alert("Ocorreu um erro inesperado. Tente recarregar a página.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm("Excluir esta disciplina permanentemente?")) return;
    const idToDelete = String(id);
    setSubjects(prev => prev.filter(s => String(s.id) !== idToDelete));
    
    if (supabase) {
      await supabase.from('subjects').delete().eq('id', idToDelete);
    }
  };

  const updateSubjectData = async (subjectId: string, payload: Partial<Subject>) => {
    const sId = String(subjectId);
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { ...s, ...payload } : s));
    if (supabase) {
      await supabase.from('subjects').update(payload).eq('id', sId);
    }
  };

  const addTopic = async (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    const newTopic = { id: Math.random().toString(36).substr(2, 9), title: newTopicTitle, completed: false, importance: 3 };
    await updateSubjectData(subjectId, { topics: [...subject.topics, newTopic] });
    setNewTopicTitle('');
  };

  const toggleTopic = async (subjectId: string, topicId: string) => {
    const subject = subjects.find(s => String(s.id) === String(subjectId));
    if (!subject) return;
    const updated = subject.topics.map(t => String(t.id) === String(topicId) ? { ...t, completed: !t.completed, lastStudiedAt: !t.completed ? new Date().toISOString() : t.lastStudiedAt } : t);
    await updateSubjectData(subjectId, { topics: updated });
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Grade de Estudos</h2>
          <p className="text-slate-500 font-medium dark:text-slate-400">Monte seu edital verticalizado.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatalogOpen(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
            <Layers size={20} /> <span className="hidden md:inline">Editais Prontos</span>
          </button>
          <div className="flex">
            <input 
              type="text" 
              placeholder="Ex: Direito Penal" 
              className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-l-2xl outline-none bg-white dark:bg-slate-900 font-bold dark:text-white w-full" 
              value={newSubjectName} 
              onChange={(e) => setNewSubjectName(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && addSubject(newSubjectName)} 
            />
            <button 
              onClick={() => addSubject(newSubjectName)} 
              disabled={loading || !newSubjectName.trim()} 
              className="bg-indigo-600 text-white px-5 rounded-r-2xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {subjects.map((subject) => {
          const sIdStr = String(subject.id);
          const isExpanded = expandedSubject === sIdStr;
          const completedCount = subject.topics.filter(t => t.completed).length;
          const progress = subject.topics.length > 0 ? (completedCount / subject.topics.length) * 100 : 0;

          return (
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
              <div className="p-5 flex items-center justify-between cursor-pointer group" onClick={() => setExpandedSubject(isExpanded ? null : sIdStr)}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{completedCount}/{subject.topics.length} tópicos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={18} /></button>
                  <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1 mt-4">
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Novo tópico do edital..." 
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                        value={newTopicTitle} 
                        onChange={(e) => setNewTopicTitle(e.target.value)} 
                        onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)} 
                      />
                      <button onClick={() => addTopic(subject.id)} className="bg-slate-800 text-white px-6 rounded-xl font-black text-xs hover:bg-slate-700">Adicionar</button>
                    </div>
                    {subject.topics.map(topic => (
                      <div key={topic.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl group transition-all">
                        <button onClick={() => toggleTopic(subject.id, topic.id)} className={`transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}><CheckCircle size={20} /></button>
                        <span className={`text-sm font-bold flex-1 ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {subjects.length === 0 && !loading && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <BookOpen className="mx-auto mb-4 text-slate-300" size={48} />
             <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Inicie o cadastro de matérias</p>
          </div>
        )}
      </div>

      {isCatalogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Catálogo de Editais</h3>
              <button onClick={() => setIsCatalogOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {predefinedEditais.map(edital => (
                <div key={edital.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-lg">{edital.name}</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase mt-1 tracking-widest">{edital.organization}</p>
                  </div>
                  <button onClick={() => {
                    setIsCatalogOpen(false);
                    edital.subjects.forEach(s => addSubject(s.name, s.topics));
                  }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 shadow-md">IMPORTAR</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disciplinas;
