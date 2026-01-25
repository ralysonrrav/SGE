
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, Loader2, 
  Plus, ShieldCheck, CheckCircle2, Ban,
  FileText, Database, Calendar, Layers, RefreshCw,
  ShieldX
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
  // Verificação de segurança sênior
  if (user.role !== 'administrator' && (user.role as any) !== 'admin') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6"><Ban size={40} /></div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">ACESSO NEGADO</h2>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // States para Usuários
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'student' | 'visitor'>('student');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'blocked' | 'suspended'>('active');

  // States para Editais
  const [isEditalModalOpen, setIsEditalModalOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<PredefinedEdital | null>(null);
  const [editalForm, setEditalForm] = useState({ name: '', organization: '', examDate: '' });
  const [editalToDelete, setEditalToDelete] = useState<PredefinedEdital | null>(null);

  // Modal de Purga (Usuários)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [userToPurge, setUserToPurge] = useState<User | null>(null);

  const refreshData = async () => {
    if (!supabase) return;
    setIsRefreshing(true);
    try {
      if (view === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('name');
        if (data) setUsers(data.map(p => ({ ...p, id: String(p.id), lastAccess: p.last_seen })));
      } else {
        const { data } = await supabase.from('predefined_editais').select('*').order('name');
        if (data) setEditais(data.map(e => ({ ...e, id: String(e.id), examDate: e.exam_date, lastUpdated: e.last_updated })));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenEditalModal = (edital?: PredefinedEdital) => {
    if (edital) {
      setEditingEdital(edital);
      setEditalForm({ 
        name: edital.name, 
        organization: edital.organization, 
        examDate: edital.examDate || '' 
      });
    } else {
      setEditingEdital(null);
      setEditalForm({ name: '', organization: '', examDate: '' });
    }
    setIsEditalModalOpen(true);
  };

  const handleSaveEdital = async () => {
    if (!supabase || !editalForm.name) return;
    setLoadingId('saving-edital');
    
    const payload = {
      name: editalForm.name,
      organization: editalForm.organization,
      exam_date: editalForm.examDate,
      subjects: editingEdital ? editingEdital.subjects : [], // Mantém matérias se for edição
      last_updated: new Date().toISOString(),
      created_by: user.id
    };

    try {
      let result;
      if (editingEdital) {
        result = await supabase.from('predefined_editais').update(payload).eq('id', editingEdital.id).select().single();
      } else {
        result = await supabase.from('predefined_editais').insert([payload]).select().single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        const saved: PredefinedEdital = {
          ...result.data,
          id: String(result.data.id),
          examDate: result.data.exam_date,
          lastUpdated: result.data.last_updated
        };

        setEditais(prev => editingEdital 
          ? prev.map(e => e.id === saved.id ? saved : e) 
          : [saved, ...prev]
        );
        setIsEditalModalOpen(false);
        setEditingEdital(null);
      }
    } catch (e: any) {
      alert(`Erro no Core: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteEdital = async (id: string) => {
    if (!supabase) return;
    setLoadingId(id);
    try {
      const { error } = await supabase.from('predefined_editais').delete().eq('id', id);
      if (error) throw error;
      setEditais(prev => prev.filter(e => e.id !== id));
      setEditalToDelete(null);
    } catch (e: any) {
      alert(`Erro ao remover: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser || !supabase) return;
    setLoadingId(editingUser.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editUserName, role: editUserRole, status: editUserStatus })
        .eq('id', editingUser.id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editUserName, role: editUserRole as any, status: editUserStatus as any } : u));
      setIsUserModalOpen(false);
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handlePurgeUser = async () => {
    if (!userToPurge || !supabase) return;
    setLoadingId(userToPurge.id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userToPurge.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userToPurge.id));
      setShowConfirmDelete(false);
      setUserToPurge(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredUsers = useMemo(() => users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm]);
  const filteredEditais = useMemo(() => editais.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || e.organization?.toLowerCase().includes(searchTerm.toLowerCase())), [editais, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
            {view === 'users' ? 'GOVERNANÇA' : 'CORE EDITAIS'}
          </h2>
          <p className="text-slate-500 font-bold mt-3 text-[10px] uppercase tracking-[0.4em]">
            {view === 'users' ? 'Controle Central de Operadores' : 'Gestão de Matrizes de Certames'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
            <input type="text" placeholder="PESQUISAR..." className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 font-black text-white text-[10px] tracking-widest uppercase transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={refreshData} disabled={isRefreshing} className="p-4 bg-white/5 border border-white/5 text-indigo-400 rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50">
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {view === 'editais' && (
            <button 
              onClick={() => handleOpenEditalModal()}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
            >
              <Plus size={16} className="inline mr-2" /> NOVA MATRIZ
            </button>
          )}
        </div>
      </header>

      {view === 'users' ? (
        <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">OPERADOR / UUID</th>
                <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">NÍVEL</th>
                <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">SITUAÇÃO</th>
                <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">SINAL</th>
                <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">COMANDOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{u.name}</p>
                        <p className="text-[9px] text-slate-600 font-bold lowercase mt-0.5">{u.email}</p>
                        <p className="text-[7px] font-black text-slate-800 uppercase tracking-tighter mt-1">ID: {u.id.substring(0,8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border tracking-widest ${u.role === 'administrator' || (u.role as any) === 'admin' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                      {(u.role as any) === 'admin' || u.role === 'administrator' ? 'ADMIN' : u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                     <span className={`bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 w-fit`}><CheckCircle2 size={10}/> {u.status?.toUpperCase() || 'ATIVO'}</span>
                  </td>
                  <td className="px-10 py-6">
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-indigo-500 pulse-ring' : 'bg-slate-800'}`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${u.isOnline ? 'text-indigo-500' : 'text-slate-700'}`}>
                          {u.isOnline ? 'ESTAÇÃO ONLINE' : 'OFFLINE'}
                        </span>
                     </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-3 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-xl transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => { setUserToPurge(u); setShowConfirmDelete(true); }} disabled={u.id === user.id} className="p-3 bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEditais.map(edital => (
            <div key={edital.id} className="glass-card rounded-[2.5rem] p-10 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
               {/* ADICIONADO pointer-events-none para não bloquear os botões abaixo */}
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <Database size={80} />
               </div>
               
               {/* ADICIONADO relative z-10 para garantir que esta camada receba os cliques */}
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                     <FileText size={24} />
                  </div>
                  <div className="flex gap-2">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleOpenEditalModal(edital); }}
                       className="p-3 bg-white/10 text-slate-400 hover:text-indigo-400 hover:bg-white/20 rounded-xl transition-all shadow-sm"
                       title="Editar Matriz"
                     >
                       <Edit3 size={16}/>
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setEditalToDelete(edital); }} 
                       className="p-3 bg-white/10 text-slate-400 hover:text-rose-500 hover:bg-white/20 rounded-xl transition-all shadow-sm"
                       title="Remover Matriz"
                     >
                       <Trash2 size={16}/>
                     </button>
                  </div>
               </div>

               <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-1 leading-tight">{edital.name}</h3>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">{edital.organization}</p>

               <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                     <div className="flex items-center gap-3">
                        <Layers size={14} className="text-indigo-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disciplinas</span>
                     </div>
                     <span className="text-xs font-black text-white">{edital.subjects?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5">
                     <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-indigo-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Exame</span>
                     </div>
                     <span className="text-[10px] font-black text-white uppercase">{edital.examDate || 'A DEFINIR'}</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE EDITAL */}
      {isEditalModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-lg rounded-[3.5rem] p-12 border border-white/10 shadow-2xl relative">
             <button onClick={() => { setIsEditalModalOpen(false); setEditingEdital(null); }} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
             
             <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                   <Database size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{editingEdital ? 'EDITAR MATRIZ' : 'NOVA MATRIZ'}</h3>
                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em]">Configuração de Certame</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NOME DO CONCURSO</label>
                   <input type="text" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" placeholder="EX: POLÍCIA FEDERAL 2024" value={editalForm.name} onChange={e => setEditalForm({...editalForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ÓRGÃO / BANCA</label>
                   <input type="text" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" placeholder="EX: PF / CEBRASPE" value={editalForm.organization} onChange={e => setEditalForm({...editalForm, organization: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">DATA DA PROVA (OPCIONAL)</label>
                   <input type="date" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" value={editalForm.examDate} onChange={e => setEditalForm({...editalForm, examDate: e.target.value})} />
                </div>
             </div>

             <button 
               onClick={handleSaveEdital} 
               disabled={loadingId === 'saving-edital'}
               className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl mt-10 flex items-center justify-center gap-3"
             >
               {loadingId === 'saving-edital' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
               {editingEdital ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR MATRIZ'}
             </button>
          </div>
        </div>
      )}

      {/* MODAL DE DELEÇÃO DE EDITAL */}
      {editalToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[3.5rem] p-12 border border-rose-500/30 text-center">
             <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2.5rem] border border-rose-500/20 flex items-center justify-center mx-auto mb-8">
                <ShieldX size={44} />
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">REMOVER MATRIZ</h3>
             <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide mb-10">
                Deseja excluir o edital <span className="text-white">"{editalToDelete.name}"</span>? Esta ação não afetará os planos de estudo já criados pelos alunos.
             </p>
             <div className="flex flex-col gap-4">
                <button 
                  onClick={() => handleDeleteEdital(editalToDelete.id)} 
                  disabled={loadingId === editalToDelete.id}
                  className="w-full bg-rose-600 text-white p-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  {loadingId === editalToDelete.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  DELETAR AGORA
                </button>
                <button onClick={() => setEditalToDelete(null)} className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] hover:text-white transition-colors">CANCELAR</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
