
import React, { useState } from 'react';
import { Subject, Topic, PredefinedEdital } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, X, Layers, ArrowRight, Loader2, Edit3, Save, AlignLeft, Check } from 'lucide-react';

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
    try {
      if (supabase) {
        const { data, error } = await supabase.from('subjects').insert([{ name: name.trim(), topics }]).select().single();
        if (!error && data) {
          setSubjects(prev => [...prev, { ...data, id: String(data.id), color: colors[prev.length % colors.length] }]);
        }
      } else {
        setSubjects(prev => [...prev, { id: Date.now().toString(), name: name.trim(), topics, color: colors[prev.length % colors.length] }]);
      }
      setNewSubjectName('');
    } finally { setLoading(false); }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta disciplina e todos os seus tópicos?")) return;
    const idToDelete = String(id);
    
    // UI Otimista
    setSubjects(prev => prev.filter(s => String(s.id) !== idToDelete));
    if (expandedSubject === idToDelete) setExpandedSubject(null);
    
    if (supabase) {
      await supabase.from('subjects').delete().eq('id', idToDelete);
    }
  };

  const updateSubjectData = async (subjectId: string, payload: Partial<Subject>) => {
    const sId = String(subjectId);
    setSubjects(prev => prev.map(s => String(s.id) === sId ? { ...s, ...payload } : s));
    if (supabase) await supabase.from('subjects').update(payload).eq('id', sId);
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    if (!window.confirm("Excluir este tópico?")) return;
    const sId = String(subjectId);
    const tId = String(topicId);
    
    const subject = subjects.find(s => String(s.id) === sId);
    if (!subject) return;
    
    const updatedTopics = subject.topics.filter(t => String(t.id) !== tId);
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
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Disciplinas</h2>
          <p className="text-slate-500 font-medium">Gerencie seu conteúdo programático.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatalogOpen(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl font-bold hover:bg-slate-200"><Layers size={20} /> Catálogo</button>
          <div className="flex">
            <input type="text" placeholder="Nova matéria..." className="px-5 py-3 border border-slate-200 dark:border-slate-800 rounded-l-2xl outline-none bg-white dark:bg-slate-900 font-bold" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addSubject(newSubjectName)} />
            <button onClick={() => addSubject(newSubjectName)} disabled={loading || !newSubjectName.trim()} className="bg-indigo-600 text-white px-5 rounded-r-2xl hover:bg-indigo-700">
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
            <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSubject(isExpanded ? null : sIdStr)}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 dark:text-slate-100">{subject.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{completedCount}/{subject.topics.length} tópicos</span>
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
                  <div className="flex items-center justify-between mt-4 mb-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tópicos</h4>
                    <button onClick={() => bulkEditId === sIdStr ? saveBulkTopics(subject.id) : (setBulkEditId(sIdStr), setBulkText(subject.topics.map(t => t.title).join('\n')))} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {bulkEditId === sIdStr ? 'SALVAR' : 'EDIÇÃO EM MASSA'}
                    </button>
                  </div>

                  {bulkEditId === sIdStr ? (
                    <textarea className="w-full h-48 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="Adicionar tópico..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold outline-none" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTopic(subject.id)} />
                        <button onClick={() => addTopic(subject.id)} className="bg-slate-800 text-white px-6 rounded-xl font-black text-xs">ADD</button>
                      </div>
                      {subject.topics.map(topic => (
                        <div key={topic.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl group transition-all">
                          <button onClick={() => toggleTopic(subject.id, topic.id)} className={`transition-all ${topic.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}><CheckCircle size={20} /></button>
                          <span className={`text-sm font-bold flex-1 ${topic.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{topic.title}</span>
                          <button onClick={() => deleteTopic(subject.id, topic.id)} className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
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
