
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, Shield, User as UserIcon, Lock, Unlock, Loader2, Database, Plus, UserPlus, Mail, Key, BookOpen, AlertTriangle
} from 'lucide-react';

interface AdminProps {
  user: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  editais: PredefinedEdital[];
  setEditais: React.Dispatch<React.SetStateAction<PredefinedEdital[]>>;
  view: 'users' | 'editais';
}

const Admin: React.FC<AdminProps> = ({ user, users, setUsers, editais, setEditais, view }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<PredefinedEdital | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isEditalModalOpen, setIsEditalModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrator' | 'student' | 'visitor'>('student');

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'student' | 'visitor'>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');

  const [editalName, setEditalName] = useState('');
  const [editalOrg, setEditalOrg] = useState('');
  const [editalSubjects, setEditalSubjects] = useState<Subject[]>([]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const parseSupabaseError = (err: any) => {
    const msg = err.message || "Erro desconhecido no banco de dados.";
    if (msg.includes("infinite recursion")) {
      return "Erro Crítico de RLS: O banco detectou um loop infinito nas políticas de segurança. Aplique o fix SQL de 'Security Definer' sugerido.";
    }
    return msg;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoadingId('creating-user');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail, password: newPassword, options: { data: { full_name: newName } }
      });
      if (authError) throw authError;
      if (authData.user) {
        if (newRole !== 'student') {
          await supabase.from('profiles').update({ role: newRole }).eq('id', authData.user.id);
        }
        setUsers(prev => [{ id: authData.user!.id, name: newName, email: newEmail, role: newRole, status: 'active', isOnline: false }, ...prev]);
        setIsAddUserModalOpen(false);
        setNewName(''); setNewEmail(''); setNewPassword('');
      }
    } catch (err: any) { setError(parseSupabaseError(err)); } finally { setLoadingId(null); }
  };

  const saveUserUpdate = async () => {
    if (!editingUser || !supabase) return;
    setLoadingId(editingUser.id);
    try {
      const updates = { name: editName, role: editRole, status: editStatus };
      const { error: upError } = await supabase.from('profiles').update(updates).eq('id', editingUser.id);
      if (upError) throw upError;
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
      setEditingUser(null);
    } catch (e: any) { setError(parseSupabaseError(e)); } finally { setLoadingId(null); }
  };

  const saveEdital = async () => {
    if (!editalName || !supabase) return;
    setLoadingId('edital-save');
    setError(null);
    const editalData = { name: editalName, organization: editalOrg, subjects: editalSubjects, last_updated: new Date().toISOString() };
    try {
      if (editingEdital) {
        const { error: updError } = await supabase.from('predefined_editais').update(editalData).eq('id', editingEdital.id);
        if (updError) throw updError;
        setEditais(prev => prev.map(e => e.id === editingEdital.id ? { ...e, ...editalData, lastUpdated: editalData.last_updated } : e));
      } else {
        const { data, error: insError } = await supabase.from('predefined_editais').insert([editalData]).select();
        if (insError) throw insError;
        if (data?.[0]) {
          setEditais(prev => [...prev, { ...data[0], id: String(data[0].id), examDate: data[0].exam_date, lastUpdated: data[0].last_updated }]);
        }
      }
      setIsEditalModalOpen(false);
      setEditingEdital(null);
    } catch (e: any) { setError(parseSupabaseError(e)); } finally { setLoadingId(null); }
  };

  const deleteEdital = async (id: string) => {
    if (!window.confirm("Excluir esta matriz permanentemente?")) return;
    setLoadingId(id);
    try {
      const { error: delError } = await supabase!.from('predefined_editais').delete().eq('id', id);
      if (delError) throw delError;
      setEditais(prev => prev.filter(e => e.id !== id));
    } catch (e: any) { alert(parseSupabaseError(e)); } finally { setLoadingId(null); }
  };

  if (view === 'users') {
    return (
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Usuários</h2>
            <p className="text-slate-500 mt-2 font-medium">Controle de acesso e governança da plataforma.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Nome ou e-mail..." className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setError(null); setIsAddUserModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95">
              <UserPlus size={20} /> NOVO USUÁRIO
            </button>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuário</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Acesso</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-black text-indigo-600">{u.name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-black dark:text-white leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${u.role === 'administrator' ? 'text-rose-500' : 'text-slate-500'}`}>
                        {u.role === 'administrator' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {u.role}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{u.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingUser(u); setEditName(u.name); setEditRole(u.role); setEditStatus(u.status); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                        <button disabled={loadingId === u.id} className="p-2 text-slate-300 hover:text-rose-500">{loadingId === u.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-100">
              <button onClick={() => setIsAddUserModalOpen(false)} className="absolute top-8 right-8 text-slate-400"><X size={24} /></button>
              <h3 className="text-2xl font-black mb-2">Cadastrar Usuário</h3>
              {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-2xl flex items-start gap-3"><AlertTriangle size={18} className="shrink-0" /><span>{error}</span></div>}
              <form onSubmit={handleCreateUser} className="space-y-5">
                <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Nome Completo" />
                <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" placeholder="E-mail" />
                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Senha Inicial" />
                <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold">
                  <option value="student">Estudante</option>
                  <option value="administrator">Administrador</option>
                </select>
                <button type="submit" disabled={!!loadingId} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-3">
                  {loadingId === 'creating-user' ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />} FINALIZAR
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Matrizes Mestre</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestão dos editais verticais globais do sistema.</p>
        </div>
        <button onClick={() => { setError(null); setEditingEdital(null); setEditalName(''); setEditalOrg(''); setEditalSubjects([]); setIsEditalModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl flex items-center gap-2 hover:bg-indigo-700 active:scale-95">
          <Plus size={20}/> NOVA MATRIZ
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {editais.map(e => (
          <div key={e.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button onClick={() => { setError(null); setEditingEdital(e); setEditalName(e.name); setEditalOrg(e.organization); setEditalSubjects(e.subjects); setIsEditalModalOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18}/></button>
              <button onClick={() => deleteEdital(e.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>
            </div>
            <Database size={32} className="text-indigo-600 mb-6" />
            <h3 className="text-2xl font-black dark:text-white leading-tight mb-2">{e.name}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-1.5 rounded-full">{e.organization}</span>
          </div>
        ))}
      </div>

      {isEditalModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden h-[85vh] flex flex-col border border-slate-100">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
               <div><h3 className="text-2xl font-black dark:text-white leading-none">Editor de Matriz</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Configuração global</p></div>
               <button onClick={() => setIsEditalModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
               {error && <div className="p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-[2rem] flex items-start gap-4"><AlertTriangle size={24} className="shrink-0" /><div className="space-y-1"><p className="font-black text-sm uppercase">Falha no Banco</p><p className="text-xs font-medium">{error}</p></div></div>}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <input value={editalName} onChange={e=>setEditalName(e.target.value)} className="w-full p-5 bg-slate-50 border rounded-2xl font-bold" placeholder="Concurso" />
                  <input value={editalOrg} onChange={e=>setEditalOrg(e.target.value)} className="w-full p-5 bg-slate-50 border rounded-2xl font-bold" placeholder="Banca" />
               </div>
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-6">
                    <h4 className="font-black text-xl">Disciplinas</h4>
                    <button onClick={() => setEditalSubjects(prev => [...prev, { id: `edsub-${Date.now()}`, name: 'Nova Matéria', topics: [], color: '#6366f1' }])} className="text-[10px] font-black bg-slate-900 text-white px-8 py-3 rounded-xl flex items-center gap-2"><Plus size={16}/> ADICIONAR</button>
                  </div>
                  {editalSubjects.map((sub, sIdx) => (
                    <div key={sub.id} className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border space-y-4">
                       <div className="flex justify-between items-center gap-4">
                          <input value={sub.name} onChange={e=>{ const n = [...editalSubjects]; n[sIdx].name = e.target.value; setEditalSubjects(n); }} className="bg-transparent text-xl font-black outline-none flex-1 border-b border-indigo-500/30 focus:border-indigo-500 pb-1" placeholder="Matéria" />
                          <button onClick={()=>setEditalSubjects(prev=>prev.filter(s=>s.id!==sub.id))} className="text-rose-500"><Trash2 size={20}/></button>
                       </div>
                       <textarea placeholder="Tópicos (um por linha)" className="w-full h-32 bg-white dark:bg-slate-950 p-6 rounded-[1.5rem] outline-none border font-bold text-sm" defaultValue={sub.topics.map(t=>t.title).join('\n')} onBlur={e=>{
                           const lines = e.target.value.split('\n').filter(l=>l.trim()!=='');
                           const n = [...editalSubjects];
                           n[sIdx].topics = lines.map(line => ({ id: Math.random().toString(36).substr(2,9), title: line.trim(), completed: false, importance: 3 }));
                           setEditalSubjects(n);
                       }} />
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-10 border-t flex flex-col md:flex-row justify-end gap-4">
              <button onClick={()=>setIsEditalModalOpen(false)} className="px-8 py-4 font-black text-slate-400 text-[10px] tracking-widest">DESCARTAR</button>
              <button onClick={saveEdital} disabled={!!loadingId} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[11px] shadow-2xl flex items-center justify-center gap-3">
                {loadingId === 'edital-save' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} PUBLICAR MATRIZ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
