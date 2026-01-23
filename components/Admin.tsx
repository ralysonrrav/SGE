
import React, { useState } from 'react';
import { User, PredefinedEdital, Subject, Topic } from '../types';
import { 
  Users, Database, Plus, Trash2, Edit3, X, Save, 
  Lock, Unlock, AlignLeft, BookOpen, Check
} from 'lucide-react';

interface AdminProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  editais: PredefinedEdital[];
  setEditais: React.Dispatch<React.SetStateAction<PredefinedEdital[]>>;
  view: 'users' | 'editais';
}

const Admin: React.FC<AdminProps> = ({ users, setUsers, editais, setEditais, view }) => {
  const [isCreatingEdital, setIsCreatingEdital] = useState(false);
  const [editingEdital, setEditingEdital] = useState<PredefinedEdital | null>(null);
  const [newEditalName, setNewEditalName] = useState('');
  const [newEditalOrg, setNewEditalOrg] = useState('');
  const [newEditalExamDate, setNewEditalExamDate] = useState('');
  const [editalSubjects, setEditalSubjects] = useState<Subject[]>([]);
  
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const addSubjectToEdital = () => {
    setEditalSubjects(prev => [...prev, { 
      id: Date.now().toString(), 
      name: 'Nova Disciplina', 
      topics: [], 
      color: colors[prev.length % colors.length] 
    }]);
  };

  const removeSubjectFromEdital = (id: string) => {
    if (!window.confirm("Deseja remover esta disciplina da grade deste edital?")) return;
    const idToRemove = String(id);
    setEditalSubjects(prev => prev.filter(s => String(s.id) !== idToRemove));
  };

  const handleTopicsChange = (sIdx: number, text: string) => {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const newTopics = lines.map(line => ({ id: Math.random().toString(36).substr(2, 9), title: line.trim(), completed: false, importance: 3 }));
    
    setEditalSubjects(prev => {
      const newState = [...prev];
      newState[sIdx] = { ...newState[sIdx], topics: newTopics };
      return newState;
    });
  };

  const deleteTopicFromEdital = (sIdx: number, tIdx: number) => {
    if (!window.confirm("Excluir este tópico específico?")) return;
    setEditalSubjects(prev => {
      const newState = [...prev];
      const targetSubject = { ...newState[sIdx] };
      targetSubject.topics = targetSubject.topics.filter((_, i) => i !== tIdx);
      newState[sIdx] = targetSubject;
      return newState;
    });
  };

  const deleteEdital = (id: string) => {
    if (!window.confirm("Atenção ADMIN: Deseja realmente excluir este edital do catálogo público?")) return;
    const idToDelete = String(id);
    setEditais(prev => prev.filter(e => String(e.id) !== idToDelete));
  };

  const saveEdital = () => {
    if (!newEditalName.trim() || !newEditalOrg.trim()) return;
    const edital: PredefinedEdital = { id: editingEdital?.id || Date.now().toString(), name: newEditalName, organization: newEditalOrg, examDate: newEditalExamDate, subjects: editalSubjects, lastUpdated: new Date().toISOString() };
    if (editingEdital) setEditais(prev => prev.map(e => String(e.id) === String(editingEdital.id) ? edital : e));
    else setEditais(prev => [...prev, edital]);
    setIsCreatingEdital(false);
  };

  if (view === 'users') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Gestão de Alunos</h2>
        </header>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Aluno</th><th className="px-8 py-5 text-[10px] font-black uppercase text-center tracking-widest">Status</th><th className="px-8 py-5 text-[10px] font-black uppercase text-right tracking-widest">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6"><div className="font-bold text-slate-800 dark:text-slate-100">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td>
                  <td className="px-8 py-6 text-center"><span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{u.status === 'active' ? 'Ativo' : 'Bloqueado'}</span></td>
                  <td className="px-8 py-6 text-right"><button onClick={() => setUsers(prev => prev.map(usr => usr.id === u.id ? {...usr, status: usr.status === 'active' ? 'blocked' : 'active'} : usr))} className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all">{u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Catálogo de Editais</h2>
        <button onClick={() => { setIsCreatingEdital(true); setEditingEdital(null); setNewEditalName(''); setNewEditalOrg(''); setEditalSubjects([]); }} className="bg-rose-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2"><Plus size={20} /> Novo Edital</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {editais.map(edital => (
          <div key={edital.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => { setEditingEdital(edital); setNewEditalName(edital.name); setNewEditalOrg(edital.organization); setEditalSubjects(edital.subjects); setIsCreatingEdital(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar Edital"><Edit3 size={18} /></button>
              <button onClick={() => deleteEdital(edital.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Excluir Edital do Catálogo"><Trash2 size={18} /></button>
            </div>
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6"><Database size={28} /></div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">{edital.name}</h3>
            <p className="text-xs font-black text-rose-600 uppercase mt-1 tracking-widest">{edital.organization}</p>
          </div>
        ))}
      </div>

      {isCreatingEdital && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 h-[85vh] flex flex-col scale-100 transition-transform">
             <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
               <div className="w-full md:w-1/3 p-10 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 space-y-6 overflow-y-auto">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Configurar Edital</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Concurso</label>
                     <input type="text" className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 transition-all" value={newEditalName} onChange={(e) => setNewEditalName(e.target.value)} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Banca Examinadora</label>
                     <input type="text" className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 outline-none font-bold bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 transition-all" value={newEditalOrg} onChange={(e) => setNewEditalOrg(e.target.value)} />
                   </div>
                 </div>
                 <div className="pt-6 space-y-3">
                   <button onClick={saveEdital} className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2"><Save size={18} /> PUBLICAR NO CATÁLOGO</button>
                   <button onClick={() => setIsCreatingEdital(false)} className="w-full text-slate-500 font-bold py-4 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">CANCELAR</button>
                 </div>
               </div>
               <div className="flex-1 p-10 overflow-y-auto">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-xl flex items-center gap-2 dark:text-white"><BookOpen className="text-rose-600" /> Grade Curricular</h4>
                    <button onClick={addSubjectToEdital} className="text-[10px] font-black bg-slate-900 dark:bg-rose-600 text-white px-5 py-2.5 rounded-xl hover:bg-rose-700 shadow-lg transition-all">+ ADICIONAR MATÉRIA</button>
                  </div>
                  <div className="space-y-8">
                    {editalSubjects.map((sub, sIdx) => (
                      <div key={sub.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group/sub hover:border-rose-100 transition-all">
                        <button onClick={() => removeSubjectFromEdital(sub.id)} className="absolute top-4 right-4 p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl opacity-0 group-hover/sub:opacity-100 transition-all" title="Remover Disciplina deste Edital"><Trash2 size={16} /></button>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: sub.color }} />
                          <input value={sub.name} onChange={(e) => { 
                            const n = [...editalSubjects]; 
                            n[sIdx] = { ...n[sIdx], name: e.target.value }; 
                            setEditalSubjects(n); 
                          }} className="bg-transparent font-black text-lg outline-none border-b border-transparent focus:border-rose-500 w-full dark:text-white transition-all" />
                        </div>
                        <div className="space-y-4">
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1 tracking-widest"><AlignLeft size={10} /> Lista de Tópicos (Edição em Massa)</p>
                             <textarea defaultValue={sub.topics.map(t => t.title).join('\n')} onBlur={(e) => handleTopicsChange(sIdx, e.target.value)} className="w-full h-32 bg-white dark:bg-slate-900 rounded-2xl p-4 outline-none border border-slate-200 dark:border-slate-800 focus:border-rose-500 dark:text-slate-200 text-sm font-bold transition-all" />
                           </div>
                           {sub.topics.length > 0 && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                               {sub.topics.map((t, tIdx) => (
                                 <div key={t.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 group/topic hover:border-rose-100 transition-all">
                                   <input className="bg-transparent text-xs font-bold outline-none flex-1 dark:text-slate-300" value={t.title} onChange={(e) => { 
                                     setEditalSubjects(prev => {
                                       const newState = [...prev];
                                       const targetSub = { ...newState[sIdx] };
                                       const targetTopics = [...targetSub.topics];
                                       targetTopics[tIdx] = { ...targetTopics[tIdx], title: e.target.value };
                                       targetSub.topics = targetTopics;
                                       newState[sIdx] = targetSub;
                                       return newState;
                                     });
                                   }} />
                                   <button onClick={() => deleteTopicFromEdital(sIdx, tIdx)} className="p-1 text-rose-300 hover:text-rose-600 opacity-0 group-hover/topic:opacity-100 transition-all" title="Excluir Tópico"><Trash2 size={12} /></button>
                                 </div>
                               ))}
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
