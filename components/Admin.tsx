
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject } from '../types';
import { supabase } from '../lib/supabase';
// Added missing icon imports from lucide-react
import { 
  Trash2, Edit3, X, Save, Search, Shield, User as UserIcon, Lock, Unlock, Loader2, Database, Plus, UserPlus, Mail, Key, BookOpen
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

  // New User states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'administrator' | 'student' | 'visitor'>('student');

  // User Edit states
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'administrator' | 'student' | 'visitor'>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'blocked'>('active');

  // Edital Edit states
  const [editalName, setEditalName] = useState('');
  const [editalOrg, setEditalOrg] = useState('');
  const [editalSubjects, setEditalSubjects] = useState<Subject[]>([]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    return (new Date().getTime() - new Date(lastSeen).getTime()) < 300000;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoadingId('creating-user');

    try {
      // 1. Criar o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { full_name: newName }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Atualizar o perfil criado pelo trigger com a role correta (o trigger padrão cria como student)
        if (newRole !== 'student') {
          await supabase.from('profiles').update({ role: newRole }).eq('id', authData.user.id);
        }

        const newUser: User = {
          id: authData.user.id,
          name: newName,
          email: newEmail,
          role: newRole,
          status: 'active',
          isOnline: false
        };

        setUsers(prev => [newUser, ...prev]);
        setIsAddUserModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('student');
        alert("Usuário cadastrado com sucesso! Um e-mail de confirmação foi enviado.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao criar usuário.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditStatus(u.status);
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
    } catch (e: any) {
      alert("Erro ao atualizar: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user.id) return alert("Você não pode excluir sua própria conta por aqui.");
    if (!window.confirm("Deseja apagar este usuário permanentemente? Esta ação não pode ser desfeita.")) return;
    
    setLoadingId(id);
    try {
      const { error: delError } = await supabase.from('profiles').delete().eq('id', id);
      if (delError) throw delError;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const saveEdital = async () => {
    if (!editalName || !supabase) return;
    setLoadingId('edital-save');
    const editalData = {
      name: editalName,
      organization: editalOrg,
      subjects: editalSubjects,
      last_updated: new Date().toISOString()
    };
    try {
      if (editingEdital) {
        await supabase.from('predefined_editais').update(editalData).eq('id', editingEdital.id);
      } else {
        const { data, error: insError } = await supabase.from('predefined_editais').insert([editalData]).select().single();
        if (insError) throw insError;
        if (data) setEditais(prev => [...prev, { ...data, examDate: data.exam_date, lastUpdated: data.last_updated }]);
      }
      setIsEditalModalOpen(false);
      setEditingEdital(null);
    } catch (e: any) {
      alert("Erro ao salvar matriz: " + e.message);
    } finally {
      setLoadingId(null);
    }
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
              <input 
                type="text" 
                placeholder="Nome ou e-mail..." 
                className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-full font-bold transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsAddUserModalOpen(true)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
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
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nível de Acesso</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center font-black text-indigo-600 text-lg">
                            {u.name.charAt(0)}
                          </div>
                          {isOnline(u.lastAccess) && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black dark:text-white leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${u.role === 'administrator' ? 'text-rose-500' : 'text-slate-500'}`}>
                        {u.role === 'administrator' ? <Shield size={12} /> : <UserIcon size={12} />}
                        {u.role === 'administrator' ? 'Administrador' : u.role === 'visitor' ? 'Visitante' : 'Estudante'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditUser(u)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => deleteUser(u.id)} 
                          disabled={loadingId === u.id}
                          className={`p-3 transition-all rounded-xl ${u.id === user.id ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                        >
                          {loadingId === u.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-400 font-bold italic text-sm tracking-widest uppercase">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Adicionar Novo Usuário */}
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800 overflow-hidden">
              <button onClick={() => setIsAddUserModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Cadastrar Usuário</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Criação de nova conta de acesso</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold rounded-2xl flex items-center gap-2">
                   <Lock size={14} /> {error}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    placeholder="Nome Completo" 
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="email"
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    placeholder="E-mail" 
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="password"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    placeholder="Senha Inicial" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Nível de Acesso</label>
                  <select 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value as any)} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="student">Estudante</option>
                    <option value="administrator">Administrador</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={!!loadingId}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loadingId === 'creating-user' ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                  FINALIZAR CADASTRO
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Editar Usuário */}
        {editingUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-100 dark:border-slate-800">
              <button onClick={() => setEditingUser(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Gerenciar Usuário</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Alteração de privilégios e status</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Nome de Exibição</label>
                  <input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Nome" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Cargo</label>
                  <select 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value as any)} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Estudante</option>
                    <option value="administrator">Administrador</option>
                    <option value="visitor">Visitante</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Status da Conta</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setEditStatus('active')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${editStatus === 'active' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                      <Unlock size={14} /> Ativo
                    </button>
                    <button onClick={() => setEditStatus('blocked')} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${editStatus === 'blocked' ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
                      <Lock size={14} /> Bloqueado
                    </button>
                  </div>
                </div>
                <button 
                  onClick={saveUserUpdate} 
                  disabled={loadingId === editingUser.id} 
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loadingId === editingUser.id ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  SALVAR ALTERAÇÕES
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // View: Editais (Catalog)
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Matrizes Mestre</h2>
          <p className="text-slate-500 mt-2 font-medium">Gestão dos editais verticais globais do sistema.</p>
        </div>
        <button 
          onClick={() => { setEditingEdital(null); setEditalName(''); setEditalOrg(''); setEditalSubjects([]); setIsEditalModalOpen(true); }} 
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20}/> NOVA MATRIZ
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {editais.map(e => (
          <div key={e.id} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button 
                onClick={() => { setEditingEdital(e); setEditalName(e.name); setEditalOrg(e.organization); setEditalSubjects(e.subjects); setIsEditalModalOpen(true); }} 
                className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
              >
                <Edit3 size={18}/>
              </button>
              <button className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                <Trash2 size={18}/>
              </button>
            </div>
            <Database size={32} className="text-indigo-600 mb-6" />
            <h3 className="text-2xl font-black dark:text-white leading-tight mb-2">{e.name}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 py-1.5 rounded-full">{e.organization}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-8 tracking-widest flex items-center gap-2">
               <BookOpen size={12} /> {e.subjects.length} DISCIPLINAS
            </p>
          </div>
        ))}
        {editais.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-400 font-bold italic text-sm tracking-widest uppercase">
            Nenhuma matriz no catálogo
          </div>
        )}
      </div>

      {isEditalModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden h-[85vh] flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
               <div>
                 <h3 className="text-2xl font-black dark:text-white leading-none">Editor de Matriz</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Configuração do conteúdo programático global</p>
               </div>
               <button onClick={() => setIsEditalModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nome do Concurso</label>
                    <input 
                      value={editalName} 
                      onChange={e=>setEditalName(e.target.value)} 
                      className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Polícia Federal 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Banca Organizadora</label>
                    <input 
                      value={editalOrg} 
                      onChange={e=>setEditalOrg(e.target.value)} 
                      className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Cebraspe"
                    />
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-6 dark:border-slate-800">
                    <h4 className="font-black text-xl dark:text-white tracking-tight">Conteúdo por Disciplina</h4>
                    <button 
                      onClick={() => setEditalSubjects(prev => [...prev, { id: `edsub-${Date.now()}`, name: 'Nova Matéria', topics: [], color: '#6366f1' }])} 
                      className="text-[10px] font-black bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <Plus size={16}/> ADICIONAR DISCIPLINA
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    {editalSubjects.map((sub, sIdx) => (
                      <div key={sub.id} className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6 shadow-sm">
                         <div className="flex justify-between items-center gap-4">
                            <input 
                              value={sub.name} 
                              onChange={e=>{ const n = [...editalSubjects]; n[sIdx].name = e.target.value; setEditalSubjects(n); }} 
                              className="bg-transparent text-2xl font-black dark:text-white outline-none flex-1 border-b border-transparent focus:border-indigo-500 pb-1" 
                              placeholder="Nome da Matéria"
                            />
                            <button onClick={()=>setEditalSubjects(prev=>prev.filter(s=>s.id!==sub.id))} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={24}/></button>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tópicos (Um por linha)</label>
                           <textarea 
                             placeholder="Ex: 1. Direito Constitucional aplicado.\n2. Controle de Constitucionalidade." 
                             className="w-full h-48 bg-white dark:bg-slate-950 p-8 rounded-[2rem] outline-none border border-slate-200 dark:border-slate-800 font-bold text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" 
                             defaultValue={sub.topics.map(t=>t.title).join('\n')} 
                             onBlur={e=>{
                               const lines = e.target.value.split('\n').filter(l=>l.trim()!=='');
                               const n = [...editalSubjects];
                               n[sIdx].topics = lines.map(line => ({ 
                                 id: Math.random().toString(36).substr(2,9), 
                                 title: line.trim(), 
                                 completed: false, 
                                 importance: 3 
                               }));
                               setEditalSubjects(n);
                             }} 
                           />
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-10 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex flex-col md:flex-row justify-end gap-4">
              <button onClick={()=>setIsEditalModalOpen(false)} className="px-8 py-4 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] hover:text-slate-600 transition-colors">DESCARTAR</button>
              <button 
                onClick={saveEdital} 
                className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-indigo-200 dark:shadow-none"
              >
                {loadingId === 'edital-save' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} 
                PUBLICAR MATRIZ NO CATÁLOGO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
