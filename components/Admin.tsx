
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, Shield, User as UserIcon, Lock, Unlock, Loader2, Check
} from 'lucide-react';

interface AdminProps {
  user: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  view: 'users' | 'editais';
}

const Admin: React.FC<AdminProps> = ({ user, users, setUsers, view }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Form states
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'student' | 'visitor'>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    return (new Date().getTime() - new Date(lastSeen).getTime()) < 300000; // 5 min
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const saveUser = async () => {
    if (!editingUser || !supabase) return;
    setLoadingId(editingUser.id);
    try {
      const updates = { name: editName, role: editRole, status: editStatus };
      const { error } = await supabase.from('profiles').update(updates).eq('id', editingUser.id);
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
      setEditingUser(null);
    } catch (e: any) {
      alert("Erro ao atualizar: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user.id) return alert("Você não pode se excluir.");
    if (!window.confirm("Deseja apagar este membro permanentemente?")) return;
    
    setLoadingId(id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Gestão da Comunidade</h2>
          <p className="text-slate-500">Administre acessos, privilégios e status dos membros.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-80 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Membro</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargo</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-black text-indigo-600">
                        {u.name.charAt(0)}
                      </div>
                      {isOnline(u.lastAccess) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white">{u.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${u.role === 'administrator' ? 'text-rose-500' : 'text-slate-500'}`}>
                    {u.role === 'administrator' ? <Shield size={12} /> : <UserIcon size={12} />}
                    {u.role === 'administrator' ? 'Admin' : 'Aluno'}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(u)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => deleteUser(u.id)} disabled={loadingId === u.id} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      {loadingId === u.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800">
            <button onClick={() => setEditingUser(null)} className="absolute top-8 right-8 text-slate-400"><X size={24} /></button>
            <h3 className="text-2xl font-black mb-8 dark:text-white">Editar Membro</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl font-bold dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Privilégio</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl font-bold dark:text-white">
                  <option value="student">Aluno</option>
                  <option value="administrator">Administrador</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Conta</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setEditStatus('active')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase flex items-center justify-center gap-2 ${editStatus === 'active' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Unlock size={14} /> Ativo
                  </button>
                  <button onClick={() => setEditStatus('blocked')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase flex items-center justify-center gap-2 ${editStatus === 'blocked' ? 'border-rose-500 bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Lock size={14} /> Bloqueado
                  </button>
                </div>
              </div>
              <button onClick={saveUser} disabled={loadingId === editingUser.id} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                {loadingId === editingUser.id ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
