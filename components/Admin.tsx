
import React, { useState } from 'react';
import { User, PredefinedEdital, Subject, Topic } from '../types';
import { 
  Users, Database, Plus, Trash2, CheckCircle, Activity, 
  Search, ShieldCheck, Mail, Calendar, Layers, X, Save, AlertTriangle, Edit3, Key, 
  Lock, Unlock, Wifi, WifiOff, Clock, UserCheck, ShieldOff
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
  const [searchTerm, setSearchTerm] = useState('');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'student' | 'visitor'>('student');

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const saveUser = () => {
    if (!userName || !userEmail) return;

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { 
        ...u, 
        name: userName, 
        email: userEmail, 
        role: userRole,
        password: userPassword || u.password
      } : u));
    } else {
      const newUser: User = {
        id: 'user_' + Date.now(),
        name: userName,
        email: userEmail,
        password: userPassword || '123456',
        role: userRole,
        status: 'active',
        isOnline: false,
        lastAccess: undefined
      };
      setUsers(prev => [...prev, newUser]);
    }
    closeUserModal();
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const newStatus = u.status === 'active' ? 'blocked' : 'active';
        if (newStatus === 'active') {
            localStorage.removeItem(`failed_attempts_${u.email.toLowerCase()}`);
        }
        return { ...u, status: newStatus };
      }
      return u;
    }));
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('student');
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserPassword('');
    setIsUserModalOpen(true);
  };

  const deleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    
    // TRAVA DE SEGURANÇA: Administrador não pode ser excluído
    if (target?.role === 'admin') {
      alert("Acesso Negado: Usuários com cargo de Administrador não podem ser removidos do sistema.");
      return;
    }

    if (confirm(`Deseja realmente excluir o usuário ${target?.name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const addSubjectToEdital = () => {
    const newSub: Subject = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name: 'Nova Disciplina',
      topics: [],
      color: colors[editalSubjects.length % colors.length]
    };
    setEditalSubjects([...editalSubjects, newSub]);
  };

  const removeSubjectFromEdital = (id: string) => {
    setEditalSubjects(prev => prev.filter(s => s.id !== id));
  };

  const openEditEdital = (edital: PredefinedEdital) => {
    setEditingEdital(edital);
    setNewEditalName(edital.name);
    setNewEditalOrg(edital.organization);
    setNewEditalExamDate(edital.examDate || '');
    setEditalSubjects(edital.subjects);
    setIsCreatingEdital(true);
  };

  const saveEdital = () => {
    if (!newEditalName || !newEditalOrg) return;
    
    if (editingEdital) {
      const updated: PredefinedEdital = {
        ...editingEdital,
        name: newEditalName,
        organization: newEditalOrg,
        examDate: newEditalExamDate,
        subjects: editalSubjects,
        lastUpdated: new Date().toISOString()
      };
      setEditais(prev => prev.map(e => e.id === editingEdital.id ? updated : e));
    } else {
      const edital: PredefinedEdital = {
        id: Date.now().toString(),
        name: newEditalName,
        organization: newEditalOrg,
        examDate: newEditalExamDate,
        subjects: editalSubjects,
        lastUpdated: new Date().toISOString()
      };
      setEditais([...editais, edital]);
    }
    
    closeEditalModal();
  };

  const closeEditalModal = () => {
    setIsCreatingEdital(false);
    setEditingEdital(null);
    setNewEditalName('');
    setNewEditalOrg('');
    setNewEditalExamDate('');
    setEditalSubjects([]);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (view === 'users') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Gestão de Alunos</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Controle total sobre o ecossistema StudyFlow.</p>
          </div>
          <button 
            onClick={() => setIsUserModalOpen(true)}
            className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all"
          >
            <Plus size={20} /> Adicionar Usuário
          </button>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-rose-500 font-bold transition-all text-slate-900 dark:text-slate-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Papel</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Online</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.role === 'admin' ? 'bg-rose-100 text-rose-600' : (u.role === 'visitor' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600')}`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 leading-none transition-colors">{u.name}</p>
                        <p className="text-xs text-slate-500 mt-1 transition-colors">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'text-rose-600 bg-rose-50' : (u.role === 'visitor' ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50')}`}>
                       {u.role === 'visitor' ? 'Visitante' : (u.role === 'admin' ? 'Admin' : 'Estudante')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {u.status === 'active' ? (
                        <>
                          <CheckCircle size={10} /> Ativo
                        </>
                      ) : (
                        <>
                          <ShieldOff size={10} /> Bloqueado
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {u.isOnline ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          Offline
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleUserStatus(u.id)} 
                        className={`p-2 rounded-xl transition-all ${u.status === 'active' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        title={u.status === 'active' ? 'Bloquear Usuário' : 'Desbloquear / Resetar Tentativas'}
                      >
                        {u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                      </button>
                      <button onClick={() => openEditUser(u)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl" title="Editar Usuário">
                        <Edit3 size={18} />
                      </button>
                      
                      {/* TRAVA VISUAL: Não permite deletar administrador */}
                      {u.role !== 'admin' && (
                        <button onClick={() => deleteUser(u.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl" title="Excluir Usuário">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isUserModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in transition-all">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button onClick={closeUserModal} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                  <input 
                    type="email" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {editingUser ? 'Resetar Senha (em branco para manter)' : 'Senha Inicial'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="password" 
                      className="w-full pl-10 pr-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-colors"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Perfil de Acesso</label>
                  <select 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none transition-colors"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                  >
                    <option value="student">Estudante (Student)</option>
                    <option value="visitor">Visitante (Limited)</option>
                    <option value="admin">Administrador (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={closeUserModal} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">CANCELAR</button>
                <button onClick={saveUser} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">SALVAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Catálogo de Editais</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Crie editais modelo para importação simplificada.</p>
        </div>
        <button 
          onClick={() => setIsCreatingEdital(true)}
          className="bg-rose-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-700 flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> Novo Edital
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {editais.map(edital => (
          <div key={edital.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:border-rose-200 transition-all transition-colors">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button onClick={() => openEditEdital(edital)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all" title="Editar Edital">
                <Edit3 size={18} />
              </button>
              <button onClick={() => setEditais(editais.filter(e => e.id !== edital.id))} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all" title="Excluir Edital">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 transition-colors">
              <Database size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight transition-colors">{edital.name}</h3>
            <p className="text-xs font-black text-rose-600 uppercase tracking-widest mt-1 transition-colors">{edital.organization}</p>
            {edital.examDate && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors">
                <Clock size={14} className="text-slate-400" />
                Prova: {formatDateDisplay(edital.examDate)}
              </div>
            )}
          </div>
        ))}
      </div>

      {isCreatingEdital && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 transition-colors">
             <div className="flex h-[80vh]">
               <div className="w-1/3 p-10 bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 transition-colors">
                    {editingEdital ? 'Editar Edital' : 'Novo Edital'}
                 </h3>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Concurso</label>
                   <input 
                      type="text" 
                      placeholder="Ex: Auditor RFB"
                      className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-rose-500 font-bold transition-all text-slate-900 dark:text-slate-100"
                      value={newEditalName}
                      onChange={(e) => setNewEditalName(e.target.value)}
                    />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Banca Examinadora</label>
                   <input 
                      type="text" 
                      placeholder="Ex: Receita Federal"
                      className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-rose-500 font-bold transition-all text-slate-900 dark:text-slate-100"
                      value={newEditalOrg}
                      onChange={(e) => setNewEditalOrg(e.target.value)}
                    />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data da Prova</label>
                   <input 
                      type="date" 
                      className="w-full px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-rose-500 font-bold transition-all text-slate-900 dark:text-slate-100"
                      value={newEditalExamDate}
                      onChange={(e) => setNewEditalExamDate(e.target.value)}
                    />
                 </div>
                  <button onClick={saveEdital} className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-700 transition-all">
                    {editingEdital ? 'ATUALIZAR' : 'PUBLICAR'}
                  </button>
                  <button onClick={closeEditalModal} className="w-full text-slate-500 font-bold py-4 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">CANCELAR</button>
               </div>
               <div className="flex-1 p-10 bg-white dark:bg-slate-900 overflow-y-auto transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-slate-900 dark:text-slate-100">Estrutura de Matérias</h4>
                    <button onClick={addSubjectToEdital} className="text-xs font-black bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl transition-all">+ ADICIONAR</button>
                  </div>
                  {editalSubjects.map((sub, sIdx) => (
                    <div key={sub.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 relative group/sub transition-colors">
                       <button 
                         onClick={() => removeSubjectFromEdital(sub.id)}
                         className="absolute -top-2 -right-2 p-1.5 bg-rose-100 text-rose-600 rounded-lg opacity-0 group-hover/sub:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white"
                         title="Remover Disciplina"
                       >
                         <X size={14} />
                       </button>
                       <input 
                         value={sub.name} 
                         placeholder="Nome da Disciplina"
                         onChange={(e) => {
                           const n = [...editalSubjects];
                           n[sIdx].name = e.target.value;
                           setEditalSubjects(n);
                         }} 
                         className="bg-transparent font-bold outline-none border-b border-rose-200 mb-2 w-full text-slate-900 dark:text-slate-100 transition-all" 
                       />
                       <textarea 
                         placeholder="Tópicos (um por linha)" 
                         defaultValue={sub.topics.map(t => t.title).join('\n')}
                         onChange={(e) => {
                           const n = [...editalSubjects];
                           n[sIdx].topics = e.target.value.split('\n').filter(l => l.trim()).map(l => ({ id: Math.random().toString(), title: l, completed: false, importance: 3 }));
                           setEditalSubjects(n);
                         }} 
                         className="w-full h-24 text-sm bg-white dark:bg-slate-900 rounded-lg p-3 outline-none border border-slate-100 dark:border-slate-800 focus:border-rose-300 dark:text-slate-200 transition-all" 
                       />
                    </div>
                  ))}
                  {editalSubjects.length === 0 && (
                    <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 font-bold transition-colors">
                      Nenhuma disciplina adicionada.
                    </div>
                  )}
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
