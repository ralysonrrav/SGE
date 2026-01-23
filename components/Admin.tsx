
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject, Topic } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Users, Database, Plus, Trash2, Edit3, X, Save, 
  Lock, Unlock, AlignLeft, BookOpen, Check, Shield, User as UserIcon, Eye, Loader2,
  TrendingUp, ShieldCheck, Mail, Globe, Search
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
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  // --- Telemetria de Usuários ---
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'administrator').length,
    students: users.filter(u => u.role === 'student').length,
    visitors: users.filter(u => u.role === 'visitor').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // --- Lógica de Usuários ---
  const updateUserInDb = async (userId: string, updates: Partial<any>) => {
    if (!supabase) return;
    setLoading(userId);
    try {
      // Nota: Profiles é a tabela que espelha os dados do auth.users
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } catch (err: any) {
      alert("Erro Crítico de Gerenciamento: " + err.message);
    } finally {
      setLoading(null);
    }
  };

  const toggleUserStatus = (u: User) => {
    const newStatus = u.status === 'active' ? 'blocked' : 'active';
    updateUserInDb(u.id, { status: newStatus });
  };

  const changeUserRole = (userId: string, newRole: User['role']) => {
    updateUserInDb(userId, { role: newRole });
  };

  if (view === 'users') {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">User Command Center</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestão centralizada de privilégios e telemetria de alunos.</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou e-mail..." 
              className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-80 font-bold transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Dash de Métricas Administrativas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Alunos</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.total}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos Agora</p>
            <div className="flex items-center gap-2">
              <h3 className="text-3xl font-black text-emerald-500">{stats.active}</h3>
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Administradores</p>
            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.admins}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitantes</p>
            <h3 className="text-3xl font-black text-amber-500">{stats.visitors}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil do Aluno</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Privilégio (RBAC)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100 dark:border-slate-700">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-slate-800 dark:text-slate-100 truncate text-sm">{u.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-0.5">
                          <Mail size={10} /> {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <select 
                        value={u.role}
                        disabled={loading === u.id}
                        onChange={(e) => changeUserRole(u.id, e.target.value as User['role'])}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase outline-none transition-all cursor-pointer border ${
                          u.role === 'administrator' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          u.role === 'visitor' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <option value="visitor">VISITANTE</option>
                        <option value="student">ESTUDANTE</option>
                        <option value="administrator">ADMINISTRADOR</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => toggleUserStatus(u)}
                      disabled={loading === u.id}
                      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all hover:scale-105 active:scale-95 ${
                      u.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 border border-rose-100'
                    }`}>
                      {u.status === 'active' ? <Check size={12} /> : <Lock size={12} />}
                      {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => toggleUserStatus(u)} 
                        disabled={loading === u.id}
                        className={`p-3 rounded-xl transition-all ${
                          u.status === 'active' 
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-500 hover:text-white' 
                            : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-500 hover:text-white'
                        }`}
                        title={u.status === 'active' ? "Bloquear Aluno" : "Desbloquear Aluno"}
                      >
                        {loading === u.id ? <Loader2 size={18} className="animate-spin" /> : (u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="py-24 text-center">
               <Users size={64} className="mx-auto text-slate-100 dark:text-slate-800 mb-6" />
               <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Nenhum aluno encontrado para sua busca</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Lógica de Editais ---
  // (Mantida e refinada para consistência visual)
  const addSubjectToEdital = () => {
    setEditalSubjects(prev => [...prev, { 
      id: Date.now().toString(), 
      name: 'Nova Disciplina', 
      topics: [], 
      color: colors[prev.length % colors.length] 
    }]);
  };

  const removeSubjectFromEdital = (id: string) => {
    if (!window.confirm("Remover disciplina do catálogo?")) return;
    setEditalSubjects(prev => prev.filter(s => String(s.id) !== String(id)));
  };

  const handleTopicsChange = (sIdx: number, text: string) => {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const newTopics = lines.map(line => ({ id: Math.random().toString(36).substr(2, 9), title: line.trim(), completed: false, importance: 3, studyTimeMinutes: 0 }));
    setEditalSubjects(prev => {
      const newState = [...prev];
      newState[sIdx] = { ...newState[sIdx], topics: newTopics };
      return newState;
    });
  };

  const saveEdital = () => {
    if (!newEditalName.trim() || !newEditalOrg.trim()) return;
    const edital: PredefinedEdital = { id: editingEdital?.id || Date.now().toString(), name: newEditalName, organization: newEditalOrg, examDate: newEditalExamDate, subjects: editalSubjects, lastUpdated: new Date().toISOString() };
    if (editingEdital) setEditais(prev => prev.map(e => String(e.id) === String(editingEdital.id) ? edital : e));
    else setEditais(prev => [...prev, edital]);
    setIsCreatingEdital(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Catálogo de Editais</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configure as matrizes curriculares públicas.</p>
        </div>
        <button onClick={() => { setIsCreatingEdital(true); setEditingEdital(null); setNewEditalName(''); setNewEditalOrg(''); setEditalSubjects([]); }} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"><Plus size={20} /> Adicionar Novo Edital</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {editais.map(edital => (
          <div key={edital.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-2xl transition-all">
            <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => { setEditingEdital(edital); setNewEditalName(edital.name); setNewEditalOrg(edital.organization); setEditalSubjects(edital.subjects); setIsCreatingEdital(true); }} className="p-3 bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-xl transition-all" title="Editar"><Edit3 size={18} /></button>
              <button onClick={() => { if(window.confirm("Excluir do catálogo global?")) setEditais(prev => prev.filter(e => e.id !== edital.id)) }} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all" title="Excluir"><Trash2 size={18} /></button>
            </div>
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner"><Database size={32} /></div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">{edital.name}</h3>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] font-black bg-rose-100 dark:bg-rose-900/40 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest">{edital.organization}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{edital.subjects.length} Matérias</span>
            </div>
          </div>
        ))}
      </div>

      {isCreatingEdital && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 h-[90vh] flex flex-col scale-100 transition-transform">
             <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
               <div className="w-full md:w-1/3 p-12 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 space-y-8 overflow-y-auto">
                 <div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100">Editor de Matriz</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">Global Catalog Master</p>
                 </div>
                 <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nome do Certame</label>
                     <input type="text" className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none font-bold bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 transition-all" value={newEditalName} onChange={(e) => setNewEditalName(e.target.value)} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Orgão / Banca</label>
                     <input type="text" className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none font-bold bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 transition-all" value={newEditalOrg} onChange={(e) => setNewEditalOrg(e.target.value)} />
                   </div>
                 </div>
                 <div className="pt-8 space-y-4">
                   <button onClick={saveEdital} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Save size={20} /> SALVAR NO CATÁLOGO</button>
                   <button onClick={() => setIsCreatingEdital(false)} className="w-full text-slate-500 font-black py-5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">DESCARTAR EDIÇÃO</button>
                 </div>
               </div>
               <div className="flex-1 p-12 overflow-y-auto bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-2xl flex items-center gap-3 dark:text-white"><BookOpen className="text-rose-600" /> Grade Curricular do Edital</h4>
                    <button onClick={addSubjectToEdital} className="text-[10px] font-black bg-slate-900 dark:bg-rose-600 text-white px-6 py-3 rounded-2xl hover:bg-rose-700 shadow-xl transition-all">+ ADICIONAR DISCIPLINA</button>
                  </div>
                  <div className="space-y-10">
                    {editalSubjects.map((sub, sIdx) => (
                      <div key={sub.id} className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group/sub transition-all hover:bg-white dark:hover:bg-slate-800">
                        <button onClick={() => removeSubjectFromEdital(sub.id)} className="absolute top-6 right-6 p-3 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all" title="Remover"><Trash2 size={18} /></button>
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-3 h-10 rounded-full" style={{ backgroundColor: sub.color }} />
                          <input value={sub.name} onChange={(e) => { 
                            const n = [...editalSubjects]; 
                            n[sIdx] = { ...n[sIdx], name: e.target.value }; 
                            setEditalSubjects(n); 
                          }} className="bg-transparent font-black text-xl outline-none border-b-2 border-transparent focus:border-rose-500 w-full dark:text-white transition-all py-2" placeholder="Nome da Disciplina..." />
                        </div>
                        <div className="space-y-4">
                           <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]"><AlignLeft size={12} /> Tópicos (Cole o texto do edital aqui)</p>
                             <textarea 
                              defaultValue={sub.topics.map(t => t.title).join('\n')} 
                              onBlur={(e) => handleTopicsChange(sIdx, e.target.value)} 
                              className="w-full h-48 bg-white dark:bg-slate-950 rounded-2xl p-6 outline-none border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-rose-500 dark:text-slate-200 text-sm font-bold transition-all leading-relaxed" 
                              placeholder="1. Tópico A&#10;2. Tópico B&#10;3. Tópico C..."
                             />
                           </div>
                        </div>
                      </div>
                    ))}
                    {editalSubjects.length === 0 && (
                       <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                         <p className="text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest">Nenhuma disciplina adicionada ainda</p>
                       </div>
                    )}
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
