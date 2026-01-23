
import React, { useState } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  X, 
  Layers,
  ArrowRight,
  Loader2,
  Edit3,
  Save,
  AlignLeft,
  Check
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
  
  const [bulkEditId, setBulkEditId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicValue, setEditTopicValue] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectValue, setEditSubjectValue] = useState('');

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const addSubject = async (name: string, topics: Topic[] = []) => {
    if (!name.trim()) return;
    setLoading(true);
    let newId = Date.now().toString();
    try {
      if (supabase) {
        const { data, error } = await supabase.from('subjects').insert([{ name: name.trim(), topics }]).select().single();
        if (!error && data) newId = String(data.id);
      }
      setSubjects(prev => [...prev, { id: newId, name: name.trim(), topics, color: colors[prev.length % colors.length] }]);
      setNewSubjectName('');
    } finally { setLoading(false); }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta disciplina? Todos os tópicos e progressos vinculados serão perdidos permanentemente.")) return;
    
    const idToDelete = String(id);
    
    // UI Otimista: Remove da interface imediatamente
    setSubjects(prev => prev.filter(s => String(s.id) !== idToDelete));
    
    if (expandedSubject === idToDelete) setExpandedSubject(null);
    
    // Executa no banco de dados
    if (supabase) {
      try {
        await supabase.from('subjects').delete().eq('id', idToDelete);
      } catch (err) {
        console.error("Erro ao deletar disciplina no banco:", err);
      }
    }
  };

  const updateSubjectData = async (subjectId: string, payload: Partial<Subject>) => {
    const sId = String(subjectId);
    
    // Atualização Imutável: Garante que o React detecte a mudança
    setSubjects(prev => prev.map(s => {
      if (String(s.id) === sId) {
        return { ...s, ...payload };
      }
      return s;
    }));
    
    if (supabase) {
      try {
        await supabase.from('subjects').update(payload).eq('id', sId);
      } catch (err) {
        console.error("Erro ao atualizar dados no banco:", err);
      }
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    if (!window.confirm("Remover este tópico da sua lista de estudos?")) return;
    
    const sId = String(subjectId);
    const tId = String(topicId);
    
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;
    
    // Cria novo array de tópicos sem o excluído
    const updatedTopics = subject.topics.filter(t => String(t.id) !== tId);
    
    // Atualiza o estado global
    await updateSubjectData(subjectId, { topics: updatedTopics });
  };

  const renameSubject = async (id: string) => {
    if (!editSubjectValue.trim()) return;
    await updateSubjectData(id, { name: editSubjectValue.trim() });
    setEditingSubjectId(null);
  };

  const renameTopic = async (subjectId: string, topicId: string) => {
    const sId = String(subjectId);
    const tId = String(topicId);
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject || !editTopicValue.trim()) return;
    
    const updated = subject.topics.map(t => String(t.id) === tId ? { ...t, title: editTopicValue.trim() } : t);
    await updateSubjectData(subjectId, { topics: updated });
    setEditingTopicId(null);
  };

  const addTopic = async (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    const sId = String(subjectId);
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;
    const newTopic = { id: Math.random().toString(36).substr(2, 9), title: newTopicTitle, completed: false, importance: 3 };
    await updateSubjectData(subjectId, { topics: [...subject.topics, newTopic] });
    setNewTopicTitle('');
  };

  const saveBulkTopics = async (subjectId: string) => {
    const sId = String(subjectId);
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;
    const lines = bulkText.split('\n').filter(l => l.trim() !== '');
    const newTopics = lines.map(line => {
      const existing = subject.topics.find(t => t.title === line.trim());
      return existing || { id: Math.random().toString(36).substr(2, 9), title: line.trim(), completed: false, importance: 3 };
    });
    await updateSubjectData(subjectId, { topics: newTopics });
    setBulkEditId(null);
  };

  const toggleTopic = async (subjectId: string, topicId: string) => {
    const sId = String(subjectId);
    const tId = String(topicId);
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;
    const updated = subject.topics.map(t => String(t.id) === tId ? { ...t, completed: !t.completed, lastStudiedAt: !t.completed ? new Date().toISOString() : t.lastStudiedAt } : t);
    await updateSubjectData(subjectId, { topics: updated });
  };

  const importEdital = async (edital: PredefinedEdital) => {
    setLoading(true);
    setIsCatalogOpen(false);
    for (const sub of edital.subjects) await addSubject(sub.name, sub.topics);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Suas Disciplinas</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle total sobre o edital e progresso.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatalogOpen(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
            <Layers size={20} /> <span className="hidden md:inline">Catálogo</span>
          </button>
          <div className="flex gap-1">
            <input type="text" placeholder="Nova matéria..." className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-l-2xl outline-none w-full md:w-48 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white transition-all" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addSubject(newSubjectName)} />
            <button onClick={() => addSubject(newSubjectName)} disabled={loading || !newSubjectName.trim()} className="bg-indigo-600 text-white px-5 rounded-r-2xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {subjects.map((subject) => {
          const completedCount = subject.topics.filter(t => t.completed).length;
          const progress = subject.topics.length > 0 ? (completedCount / subject.topics.length) * 100 : 0;
          const sIdStr = String(subject.id);
          const isBulk = bulkEditId === sIdStr;
          const isExpanded = expandedSubject === sIdStr;
          
          return (
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-indigo-100 dark:hover:border-indigo-900/40">
              <div className="p-5 flex items-center justify-between cursor-pointer group/header" onClick={() => !isBulk && setExpandedSubject(isExpanded ? null : sIdStr)}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1">
                    {editingSubjectId === sIdStr ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input autoFocus className="bg-transparent border-b-2 border-indigo-500 font-black text-slate-800 dark:text-white outline-none" value={editSubjectValue} onChange={(e) => setEditSubjectValue(e.target.value)} onBlur={() => renameSubject(subject.id)} onKeyPress={(e) => e.key === 'Enter' && renameSubject(subject.id)} />
                        <Check size={16} className="text-emerald-500" onClick={() => renameSubject(subject.id)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <h3 className="font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                        <Edit3 size={14} className="text-slate-300 opacity-0 group-hover/title:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(sIdStr); setEditSubjectValue(subject.name); }} />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{completedCount}/{subject.topics.length} tópicos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }} 
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Excluir Disciplina"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 group-hover/header:text-slate-600'}`}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mt-4 mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo Programático</h4>
                    <button onClick={() => isBulk ? saveBulkTopics(subject.id) : (setBulkEditId(sIdStr), setBulkText(subject.topics.map(t => t.title).join('\n')))} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${isBulk ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>
                      {isBulk ? <><Save size={12} /> SALVAR ALTERAÇÕES</> : <><AlignLeft size={12} /> EDIÇÃO EM MASSA</>}
                    </button>
                  </div>

                  {isBulk ? (
                    <div className="space-y-3">
                      <textarea className="w-full h-48 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
                      <div className="flex gap-2"><button onClick={() => setBulkEditId(null)} className="flex-1 py-3 text-xs font-bold text-slate-400 hover:bg-slate-100 rounded-xl">CANCELAR</button><button onClick={() => saveBulkTopics(subject.id)} className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg">ATUALIZAR TUDO</button></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="Adicionar tópico..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)} />
                        <button onClick={() => addTopic(subject.id)} className="bg-slate-800 text-white px-6 rounded-xl font-black text-xs hover:bg-slate-700 transition-colors">ADD</button>
                      </div>
                      <div className="space-y-1">
                        {subject.topics.map(topic => (
                          <div key={topic.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl group transition-all">
                            <button onClick={() => toggleTopic(subject.id, topic.id)} className={`transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}><CheckCircle size={20} /></button>
                            {editingTopicId === String(topic.id) ? (
                              <input autoFocus className="flex-1 bg-transparent border-b border-indigo-400 text-sm font-bold outline-none" value={editTopicValue} onChange={(e) => setEditTopicValue(e.target.value)} onBlur={() => renameTopic(subject.id, topic.id)} onKeyPress={(e) => e.key === 'Enter' && renameTopic(subject.id, topic.id)} />
                            ) : (
                              <span className={`text-sm font-bold flex-1 ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                            )}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                               <button onClick={() => { setEditingTopicId(String(topic.id)); setEditTopicValue(topic.title); }} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="Editar Tópico"><Edit3 size={14} /></button>
                               <button onClick={() => deleteTopic(subject.id, topic.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir Tópico"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isCatalogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Catálogo de Editais</h3>
              <button onClick={() => setIsCatalogOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {predefinedEditais.map(edital => (
                <div key={edital.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white text-lg">{edital.name}</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase mt-1 tracking-widest">{edital.organization}</p>
                  </div>
                  <button onClick={() => importEdital(edital)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">IMPORTAR <ArrowRight size={14} /></button>
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
