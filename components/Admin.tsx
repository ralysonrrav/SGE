
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, Shield, User as UserIcon, Loader2, 
  Database, Plus, UserPlus, AlertTriangle, ShieldCheck, Mail, Lock, UserCheck,
  Wifi, WifiOff
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

  // Estados para Novo Usuário
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrator' | 'student' | 'visitor'>('student');

  // Estados para Edição de Usuário
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'student' | 'visitor'>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');

  // Estados para Matriz
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
    if (msg.includes("permission denied")) return "Permissão negada no banco.";
    return msg;
  };

  const getConnectivityStatus = (lastAccess?: string) => {
    if (!lastAccess) return { online: false, label: 'Nunca' };
    const lastDate = new Date(lastAccess).getTime();
    const now = new Date().getTime();
    const diffMins = (now - lastDate) / 1000 / 60;
    if (diffMins < 5) return { online: true, label: 'Ativo Agora' };
    if (diffMins < 60) return { online: false, label: `Há ${Math.floor(diffMins)}m` };
    if (diffMins < 1440) return { online: false, label: `Há ${Math.floor(diffMins/60)}h` };
    return { online: false, label: new Date(lastAccess).toLocaleDateString() };
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoadingId('add-user');
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: newEmail, password: newPassword, options: { data: { full_name: newName } }
      });
      if (authError) throw authError;
      if (data.user) {
        if (newRole !== 'student') await supabase.from('profiles').update({ role: newRole }).eq('id', data.user.id);
        const newUser: User = { id: data.user.id, name: newName, email: newEmail, role: newRole, status: 'active', isOnline: false };
        setUsers(prev => [newUser, ...prev]);
        setIsAddUserModalOpen(false);
        setNewName(''); setNewEmail(''); setNewPassword('');
      }
    } catch (err: any) { setError(parseSupabaseError(err)); } finally { setLoadingId(null); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !supabase) return;
    setLoadingId(editingUser.id);
    setError(null);
    try {
      const { error: updError } = await supabase.from('profiles').update({ name: editName, role: editRole, status: editStatus }).eq('id', editingUser.id);
      if (updError) throw updError;
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editName, role: editRole, status: editStatus } : u));
      setEditingUser(null);
    } catch (err: any) { setError(parseSupabaseError(err)); } finally { setLoadingId(null); }
  };

  const handleDeleteUser = async (targetId: string) => {
    if (targetId === user.id) { alert("Você não pode excluir sua própria conta de administrador."); return; }
    if (!window.confirm("Isso removerá o acesso e o PERFIL do usuário. Continuar?")) return;
    setLoadingId(targetId);
    try {
      const { error: delError } = await supabase!.from('profiles').delete().eq('id', targetId);
      if (delError) throw delError;
      setUsers(prev => prev.filter(u => u.id !== targetId));
    } catch (err: any) { alert(parseSupabaseError(err)); } finally { setLoadingId(null); }
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
        if (data?.[0]) setEditais(prev => [{ ...data[0], id: String(data[0].id), examDate: data[0].exam_date, lastUpdated: data[0].last_updated }, ...prev]);
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
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">GOVERNANÇA</h2>
            <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Controle de acesso e governança da plataforma</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder="Nome ou e-mail..." className="pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 w-full font-black text-white text-[10px] tracking-widest uppercase transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setError(null); setIsAddUserModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 active:scale-95">
              <UserPlus size={20} /> NOVO USUÁRIO
            </button>
          </div>
        </header>

        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">Usuário</th>
                  <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">Acesso</th>
                  <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Conectividade</th>
                  <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => {
                  const conn = getConnectivityStatus(u.lastAccess);
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400">{u.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-black text-white leading-tight uppercase tracking-tight">{u.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${u.role === 'administrator' ? 'text-rose-500' : 'text-slate-500'}`}>
                          {u.role === 'administrator' ? <Shield size={12} /> : <UserIcon size={12} />}
                          {u.role}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${conn.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${conn.online ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {conn.online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{conn.label}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>{u.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingUser(u); setEditName(u.name); setEditRole(u.role); setEditStatus(u.status); }} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Edit3 size={18} /></button>
                          <button onClick={() => handleDeleteUser(u.id)} disabled={loadingId === u.id} className="p-2 text-slate-600 hover:text-rose-500 transition-colors">
                            {loadingId === u.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
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

        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
            <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">CONVIDAR USUÁRIO</h3>
                <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required value={newName} onChange={e=>setNewName(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500" placeholder="Nome" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <input required type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Temporária</label>
                  <input required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500" placeholder="mínimo 6 dígitos" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nível de Acesso</label>
                  <select value={newRole} onChange={e=>setNewRole(e.target.value as any)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500">
                    <option value="student">Estudante (Padrão)</option>
                    <option value="administrator">Administrador</option>
                    <option value="visitor">Visitante (Apenas Leitura)</option>
                  </select>
                </div>
                {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center">{error}</p>}
                <button disabled={loadingId === 'add-user'} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
                  {loadingId === 'add-user' ? <Loader2 className="animate-spin" size={20} /> : <UserCheck size={20}/>} CADASTRAR USUÁRIO
                </button>
              </form>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
            <div className="glass-card w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">EDITAR PERFIL</h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                  <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nível de Acesso</label>
                  <select value={editRole} onChange={e=>setEditRole(e.target.value as any)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500">
                    <option value="student">Estudante</option>
                    <option value="administrator">Administrador</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Status da Conta</label>
                  <select value={editStatus} onChange={e=>setEditStatus(e.target.value as any)} className="w-full p-4 bg-black/40 border border-white/5 rounded-xl font-black text-white text-xs outline-none focus:border-indigo-500">
                    <option value="active">Ativa</option>
                    <option value="blocked">Bloqueada / Suspensa</option>
                  </select>
                </div>
                {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center">{error}</p>}
                <div className="flex gap-4 pt-4">
                  <button onClick={()=>setEditingUser(null)} className="flex-1 p-4 font-black text-slate-500 text-[10px] tracking-widest uppercase">CANCELAR</button>
                  <button onClick={handleUpdateUser} disabled={!!loadingId} className="flex-[2] bg-indigo-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 active:scale-95 transition-all flex justify-center items-center gap-2">
                    {loadingId === editingUser.id ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>} ATUALIZAR
                  </button>
                </div>
              </div>
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
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">MATRIZES MESTRE</h2>
          <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Gestão dos editais verticais globais do sistema</p>
        </div>
        <button onClick={() => { setError(null); setEditingEdital(null); setEditalName(''); setEditalOrg(''); setEditalSubjects([]); setIsEditalModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all">
          <Plus size={20}/> NOVA MATRIZ
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {editais.map(e => (
          <div key={e.id} className="glass-card p-10 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/30 transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button onClick={() => { setError(null); setEditingEdital(e); setEditalName(e.name); setEditalOrg(e.organization); setEditalSubjects(e.subjects); setIsEditalModalOpen(true); }} className="p-3 bg-white/5 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18}/></button>
              <button onClick={() => deleteEdital(e.id)} className="p-3 bg-white/5 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18}/></button>
            </div>
            <Database size={32} className="text-indigo-500 mb-6" />
            <h3 className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-tight">{e.name}</h3>
            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full">{e.organization}</span>
          </div>
        ))}
      </div>

      {isEditalModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden h-[85vh] flex flex-col border border-white/10">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
               <div><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Editor de Matriz</h3><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-2">Configuração global do núcleo</p></div>
               <button onClick={() => setIsEditalModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
               {error && <div className="p-6 bg-rose-500/5 border border-rose-500/20 text-rose-500 rounded-[2rem] flex items-start gap-4"><AlertTriangle size={24} className="shrink-0" /><div className="space-y-1"><p className="font-black text-[10px] uppercase tracking-widest">Falha no Banco</p><p className="text-xs font-medium">{error}</p></div></div>}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome do Concurso</label>
                    <input value={editalName} onChange={e=>setEditalName(e.target.value)} className="w-full p-5 bg-black/40 border border-white/10 rounded-2xl font-black text-white text-xs uppercase outline-none focus:border-indigo-500" placeholder="Ex: Polícia Federal" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Banca Organizadora</label>
                    <input value={editalOrg} onChange={e=>setEditalOrg(e.target.value)} className="w-full p-5 bg-black/40 border border-white/10 rounded-2xl font-black text-white text-xs uppercase outline-none focus:border-indigo-500" placeholder="Ex: Cebraspe" />
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <h4 className="font-black text-xl text-white tracking-tighter uppercase">Disciplinas</h4>
                    <button onClick={() => setEditalSubjects(prev => [...prev, { id: `edsub-${Date.now()}`, name: 'Nova Matéria', topics: [], color: '#6366f1' }])} className="text-[9px] font-black bg-white/5 text-white border border-white/10 px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all uppercase tracking-widest"><Plus size={16}/> ADICIONAR MATÉRIA</button>
                  </div>
                  {editalSubjects.map((sub, sIdx) => (
                    <div key={sub.id} className="p-8 bg-black/20 rounded-[2.5rem] border border-white/5 space-y-4 shadow-sm group hover:border-indigo-500/30 transition-all">
                       <div className="flex justify-between items-center gap-4">
                          <input value={sub.name} onChange={e=>{ const n = [...editalSubjects]; n[sIdx].name = e.target.value; setEditalSubjects(n); }} className="bg-transparent text-xl font-black text-white outline-none flex-1 border-b border-white/5 focus:border-indigo-500 pb-1 uppercase tracking-tight" placeholder="Ex: Direito Constitucional" />
                          <button onClick={()=>setEditalSubjects(prev=>prev.filter(s=>s.id!==sub.id))} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                       </div>
                       <textarea placeholder="Liste os tópicos (um por linha)..." className="w-full h-40 bg-black/40 p-6 rounded-[1.5rem] outline-none border border-white/5 font-black text-[11px] leading-relaxed text-slate-300 uppercase tracking-widest focus:border-indigo-500 transition-all" defaultValue={sub.topics.map(t=>t.title).join('\n')} onBlur={e=>{
                           const lines = e.target.value.split('\n').filter(l=>l.trim()!=='');
                           const n = [...editalSubjects];
                           n[sIdx].topics = lines.map(line => ({ 
                             id: Math.random().toString(36).substr(2,9), 
                             title: line.trim(), 
                             completed: false, 
                             importance: 3,
                             studyTimeMinutes: 0
                           }));
                           setEditalSubjects(n);
                       }} />
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-10 border-t border-white/5 flex flex-col md:flex-row justify-end gap-4 bg-black/20">
              <button onClick={()=>setIsEditalModalOpen(false)} className="px-8 py-4 font-black text-slate-500 text-[10px] tracking-widest hover:text-white uppercase">CANCELAR</button>
              <button onClick={saveEdital} disabled={!!loadingId} className="bg-indigo-600 text-white px-12 py-5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-500 active:scale-95 transition-all">
                {loadingId === 'edital-save' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} {editingEdital ? 'ATUALIZAR MATRIZ' : 'PUBLICAR NO SISTEMA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
