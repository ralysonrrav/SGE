
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, Shield, User as UserIcon, Loader2, 
  Database, Plus, UserPlus, AlertTriangle, ShieldCheck, Mail, Lock, UserCheck,
  Wifi, WifiOff, Copy, Check, ShieldAlert, CheckCircle2, Ban
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
  // SEGURANÇA MESTRE: Bloqueio imediato para não-admins
  if (user.role !== 'administrator') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          <Ban size={48} />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">ACESSO NEGADO</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] max-w-md text-center">
          Seu terminal não possui privilégios de nível <span className="text-rose-500">ADMINISTRADOR</span> para acessar este núcleo.
        </p>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Estados para Novo Usuário
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrator' | 'student' | 'visitor'>('student');

  // Estados para Edição de Usuário
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'student' | 'visitor'>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopySuccess(email);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const getConnectivityStatus = (lastAccess?: string) => {
    if (!lastAccess) return { online: false, label: 'OFFLINE', color: 'text-slate-600' };
    const lastDate = new Date(lastAccess).getTime();
    const now = new Date().getTime();
    const diffMins = (now - lastDate) / 1000 / 60;
    
    if (diffMins < 3) return { online: true, label: 'ONLINE AGORA', color: 'text-emerald-500' };
    if (diffMins < 60) return { online: false, label: `HÁ ${Math.floor(diffMins)}M`, color: 'text-amber-500' };
    return { online: false, label: new Date(lastAccess).toLocaleDateString('pt-BR'), color: 'text-slate-500' };
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoadingId('add-user');
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: newEmail, 
        password: newPassword, 
        options: { data: { full_name: newName, role: newRole } }
      });
      if (authError) throw authError;
      if (data.user) {
        await supabase.from('profiles').update({ name: newName, role: newRole, email: newEmail }).eq('id', data.user.id);
        const newUser: User = { id: data.user.id, name: newName, email: newEmail, role: newRole, status: 'active', isOnline: false };
        setUsers(prev => [newUser, ...prev]);
        setIsAddUserModalOpen(false);
        setNewName(''); setNewEmail(''); setNewPassword('');
      }
    } catch (err: any) { 
      setError(err.message || "Erro ao criar usuário."); 
    } finally { setLoadingId(null); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !supabase) return;
    setLoadingId(editingUser.id);
    setError(null);
    try {
      const { error: updError } = await supabase.from('profiles')
        .update({ name: editName, role: editRole, status: editStatus })
        .eq('id', editingUser.id);
      if (updError) throw updError;
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editName, role: editRole, status: editStatus } : u));
      setEditingUser(null);
    } catch (err: any) { 
      setError(err.message || "Erro ao atualizar perfil."); 
    } finally { setLoadingId(null); }
  };

  // EXECUÇÃO FINAL DE EXCLUSÃO
  const executeDeleteUser = async () => {
    if (!userToDelete || !supabase) return;
    const targetId = userToDelete.id;
    setLoadingId(targetId);
    try {
      // Nota: Excluir de profiles apenas remove o acesso aos dados. 
      // Para excluir do Auth, seria necessário a API de Admin do Supabase, que não está no client anon.
      const { error: delError } = await supabase.from('profiles').delete().eq('id', targetId);
      if (delError) throw delError;
      setUsers(prev => prev.filter(u => u.id !== targetId));
      setUserToDelete(null);
    } catch (err: any) { 
      alert(err.message || "Erro ao deletar perfil."); 
    } finally { setLoadingId(null); }
  };

  const deleteEdital = async (id: string) => {
    if (!supabase) return;
    try {
      const { error: delError } = await supabase.from('predefined_editais').delete().eq('id', id);
      if (delError) throw delError;
      setEditais(prev => prev.filter(e => e.id !== id));
    } catch (err: any) { 
      alert(err.message || "Erro ao deletar edital."); 
    }
  };

  if (view === 'users') {
    return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-20">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">GOVERNANÇA</h2>
            <p className="text-slate-500 font-bold mt-3 text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-500" /> OPERADORES E PRIVILÉGIOS DO SISTEMA
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 lg:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input type="text" placeholder="FILTRAR TERMINAL..." className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 font-black text-white text-[10px] tracking-widest uppercase transition-all shadow-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setError(null); setIsAddUserModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95">
              <UserPlus size={18} /> CADASTRAR OPERADOR
            </button>
          </div>
        </header>

        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">OPERADOR</th>
                  <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">NÍVEL</th>
                  <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">CONECTIVIDADE</th>
                  <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">STATUS</th>
                  <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => {
                  const conn = getConnectivityStatus(u.lastAccess);
                  const isMaster = u.role === 'administrator';
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border transition-all ${isMaster ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                            {u.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white leading-none uppercase tracking-tight">{u.name || 'OPERADOR SEM NOME'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{u.email}</p>
                              <button onClick={() => handleCopyEmail(u.email)} className={`p-1 transition-colors ${copySuccess === u.email ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-400'}`}>
                                {copySuccess === u.email ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${isMaster ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                          {isMaster ? <ShieldCheck size={10} /> : <UserIcon size={10} />}
                          {u.role}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${conn.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${conn.color}`}>{conn.label}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${u.status === 'active' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/5 text-rose-500 border-rose-500/10'}`}>
                          {u.status === 'active' ? 'ATIVO' : 'BLOQUEADO'}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingUser(u); setEditName(u.name); setEditRole(u.role); setEditStatus(u.status); }} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all"><Edit3 size={16} /></button>
                          <button 
                            onClick={() => setUserToDelete(u)} 
                            disabled={u.id === user.id}
                            className={`p-3 bg-white/5 border border-white/5 rounded-xl transition-all ${u.id === user.id ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-rose-500'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (UX SÊNIOR) */}
        {userToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-md rounded-[3rem] p-12 border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.15)] text-center scale-up-center">
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">CONFIRMAR EXCLUSÃO?</h3>
              <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10 uppercase tracking-wide">
                Você está prestes a remover o acesso de <span className="text-rose-400">"{userToDelete.name}"</span>. 
                Esta ação revogará todos os privilégios deste terminal imediatamente.
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={executeDeleteUser} 
                  disabled={!!loadingId}
                  className="w-full bg-rose-600 text-white font-black py-5 rounded-2xl text-[10px] tracking-[0.2em] hover:bg-rose-500 transition-all shadow-xl shadow-rose-950/30 active:scale-95 uppercase flex justify-center items-center gap-3"
                >
                  {loadingId === userToDelete.id ? <Loader2 className="animate-spin" size={16} /> : <ShieldAlert size={16}/>} 
                  CONFIRMAR EXCLUSÃO
                </button>
                <button onClick={() => setUserToDelete(null)} className="w-full py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">ABORTAR MISSÃO</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CADASTRAR NOVO OPERADOR */}
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">NOVO OPERADOR</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Sincronização de credenciais de acesso</p>
                </div>
                <button onClick={() => setIsAddUserModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input required value={newName} onChange={e=>setNewName(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-xs outline-none focus:border-indigo-500 uppercase transition-all" placeholder="NOME COMPLETO" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input required type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-xs outline-none focus:border-indigo-500 transition-all" placeholder="EMAIL@SISTEMA.COM" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-xs outline-none focus:border-indigo-500 transition-all" placeholder="SENHA" />
                    </div>
                    <select value={newRole} onChange={e=>setNewRole(e.target.value as any)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-[10px] outline-none focus:border-indigo-500 uppercase tracking-widest appearance-none">
                      <option value="student">ESTUDANTE</option>
                      <option value="administrator">ADMIN MASTER</option>
                      <option value="visitor">VISITANTE</option>
                    </select>
                  </div>
                </div>
                {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase text-center rounded-xl">{error}</div>}
                <button disabled={loadingId === 'add-user'} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-indigo-500 active:scale-95 transition-all flex justify-center items-center gap-3 mt-4">
                  {loadingId === 'add-user' ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20}/>} CONSOLIDAR ACESSO
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDITAR OPERADOR */}
        {editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">EDITAR TERMINAL</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">NOME DO OPERADOR</label>
                  <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-xs outline-none focus:border-indigo-500 uppercase transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">PRIVILÉGIO</label>
                    <select value={editRole} onChange={e=>setEditRole(e.target.value as any)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-white text-[10px] outline-none focus:border-indigo-500 uppercase appearance-none">
                      <option value="student">ESTUDANTE</option>
                      <option value="administrator">ADMIN MASTER</option>
                      <option value="visitor">VISITANTE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">STATUS</label>
                    <select value={editStatus} onChange={e=>setEditStatus(e.target.value as any)} className={`w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl font-black text-[10px] outline-none focus:border-indigo-500 uppercase appearance-none ${editStatus === 'blocked' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      <option value="active">ATIVO / LIBERADO</option>
                      <option value="blocked">BLOQUEADO / SUSPENSO</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={()=>setEditingUser(null)} className="flex-1 p-4 font-black text-slate-500 text-[10px] uppercase hover:text-white transition-colors">CANCELAR</button>
                  <button onClick={handleUpdateUser} disabled={!!loadingId} className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all flex justify-center items-center gap-3">
                    {loadingId === editingUser.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20}/>} SALVAR ALTERAÇÕES
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Visualização de Editais (Mantida a estrutura robusta anterior)
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">MATRIZES MESTRE</h2>
          <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">NÚCLEO ESTRATÉGICO DE EDITAIS VERTICAIS</p>
        </div>
        <button onClick={() => { setError(null); setLoadingId(null); setIsAddUserModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all">
          <Plus size={20}/> NOVA MATRIZ
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {editais.map(e => (
          <div key={e.id} className="glass-card p-10 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/30 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button className="p-3 bg-white/5 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18}/></button>
              <button onClick={() => deleteEdital(e.id)} className="p-3 bg-white/5 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>
            </div>
            <Database size={32} className="text-indigo-500 mb-6" />
            <h3 className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-tight">{e.name}</h3>
            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full">{e.organization}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
