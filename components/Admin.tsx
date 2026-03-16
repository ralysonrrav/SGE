
import React, { useState, useMemo, useEffect } from 'react';
import { User, PredefinedEdital, Subject, Topic } from '../types';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { 
  Trash2, Edit3, X, Save, Search, Loader2, 
  Plus, ShieldCheck, CheckCircle2, Ban,
  FileText, Database, Calendar, Layers, RefreshCw,
  ShieldX, Clock, Timer, Info
} from 'lucide-react';

interface AdminProps {
  user: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  editais: PredefinedEdital[];
  setEditais: React.Dispatch<React.SetStateAction<PredefinedEdital[]>>;
  view: 'users' | 'editais';
}

const Admin: React.FC<AdminProps> = ({ user, users, setUsers, editais, setEditais, view: initialView }) => {
  // Verificação de segurança sênior
  if (user.role !== 'administrator' && (user.role as any) !== 'admin') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6"><Ban size={40} /></div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">ACESSO NEGADO</h2>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'users' | 'editais'>(
    users.some(u => u.status === 'pending') ? 'users' : initialView
  );

  useEffect(() => {
    refreshData();
  }, [activeTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // States para Usuários
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'administrator' | 'student' | 'mentor' | 'visitor'>('student');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'blocked' | 'pending'>('active');

  // States para Editais
  const [isEditalModalOpen, setIsEditalModalOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<PredefinedEdital | null>(null);
  const [editalForm, setEditalForm] = useState({ name: '', organization: '', examDate: '' });
  const [editalSubjects, setEditalSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [editalToDelete, setEditalToDelete] = useState<PredefinedEdital | null>(null);

  // Modal de Purga (Usuários)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [userToPurge, setUserToPurge] = useState<User | null>(null);

  useEffect(() => {
    if (editingUser) {
      setEditUserName(editingUser.name || '');
      setEditUserRole(editingUser.role as any);
      setEditUserStatus(editingUser.status as any);
    }
  }, [editingUser]);

  const refreshData = async () => {
    if (!supabase) return;
    setIsRefreshing(true);
    try {
      if (activeTab === 'users') {
        const { data: profiles } = await supabase.from('profiles').select('*').order('name');
        const { data: logs } = await supabase.from('study_logs').select('user_id, minutes');
        
        if (profiles) {
          const usersWithProgress = profiles.map(p => {
            const userLogs = logs?.filter(l => l.user_id === p.id) || [];
            const totalMinutes = userLogs.reduce((acc, curr) => acc + curr.minutes, 0);
            
            // Forçar role de administrador para o e-mail mestre na lista
            let finalRole = p.role;
            if (p.email === 'ralysonriccelli@gmail.com') {
              finalRole = 'administrator';
            }

            return { 
              ...p, 
              id: String(p.id), 
              role: finalRole,
              lastAccess: p.last_seen,
              status: p.status || 'pending',
              totalStudyTime: totalMinutes
            };
          });
          setUsers(usersWithProgress);
        }
      } else {
        const { data } = await supabase.from('predefined_editais').select('*').order('name');
        if (data) setEditais(data.map(e => ({ ...e, id: String(e.id), examDate: e.exam_date, lastUpdated: e.last_updated })));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickStatusUpdate = async (userId: string, status: 'active' | 'blocked' | 'pending') => {
    if (!supabase) return;
    setLoadingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
      if (error) throw error;
      
      const targetUser = users.find(u => u.id === userId);
      if (status === 'active' && targetUser) {
        const result = await notificationService.sendApprovalEmail(targetUser.email, targetUser.name);
        if (result && !result.success && result.error === 'SANDBOX_RESTRICTION') {
          alert("AVISO DE E-MAIL: O usuário foi aprovado, mas o e-mail não foi enviado devido à restrição de teste (Sandbox) do Resend. \n\nNo modo gratuito, você só pode enviar e-mails para o seu próprio endereço (ralysonriccelli@gmail.com). \n\nPara enviar para outros usuários, você precisa verificar um domínio em resend.com/domains.");
        }
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleQuickRoleUpdate = async (userId: string, role: string) => {
    if (!supabase) return;
    setLoadingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as any } : u));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingId(null);
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
      setEditalSubjects(edital.subjects || []);
    } else {
      setEditingEdital(null);
      setEditalForm({ name: '', organization: '', examDate: '' });
      setEditalSubjects([]);
    }
    setIsEditalModalOpen(true);
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    
    // Suporte a múltiplas disciplinas (vírgula ou nova linha)
    const names = newSubjectName.split(/\n|,/).map(n => n.trim()).filter(n => n.length > 0);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    
    const newSubs: Subject[] = names.map((name, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      name: name,
      topics: [],
      color: colors[(editalSubjects.length + idx) % colors.length]
    }));

    setEditalSubjects([...editalSubjects, ...newSubs]);
    setNewSubjectName('');
    if (newSubs.length === 1) setExpandedSubjectId(newSubs[0].id);
  };

  const handleRemoveSubject = (id: string) => {
    setEditalSubjects(editalSubjects.filter(s => s.id !== id));
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicTitle.trim()) return;
    
    // Lógica de Importação Ultra-Inteligente com Proteção de Leis e Dados
    // 1. Normalizamos separadores de lista comuns (removido ponto e vírgula conforme solicitado)
    const rawText = newTopicTitle.replace(/•/g, '\n');
    
    // 2. Segmentamos por quebra de linha OU por espaço que precede uma numeração clara.
    // CRITICAL: Para evitar quebrar leis (ex: 12.527/2011), exigimos que o número 
    // seja seguido por um separador (. ou - ou )) E um espaço obrigatório (\s+).
    const segments = rawText.split(/\n|(?:\s+(?=\d+(?:\.\d+)*[\.\-\)]\s+))/);
    
    const lines = segments
      .map(l => l.trim()) 
      .filter(l => l.length > 1); // Ignora fragmentos vazios
    
    const newTopics: Topic[] = lines.map((line, index) => ({
      id: `topic-${Date.now()}-${index}`,
      title: line,
      completed: false,
      importance: 3
    }));

    setEditalSubjects(editalSubjects.map(s => 
      s.id === subjectId ? { ...s, topics: [...s.topics, ...newTopics] } : s
    ));
    setNewTopicTitle('');
  };

  const handleRemoveTopic = (subjectId: string, topicId: string) => {
    setEditalSubjects(editalSubjects.map(s => 
      s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
    ));
  };

  const handleSaveEdital = async () => {
    if (!supabase || !editalForm.name) return;
    setLoadingId('saving-edital');
    
    const payload = {
      name: editalForm.name,
      organization: editalForm.organization,
      exam_date: editalForm.examDate,
      subjects: editalSubjects,
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
        .update({ 
          name: editUserName, 
          role: editUserRole, 
          status: editUserStatus 
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      // Notificar se o status mudou para ativo
      if (editUserStatus === 'active' && editingUser.status !== 'active') {
        const result = await notificationService.sendApprovalEmail(editingUser.email, editUserName);
        if (result && !result.success && result.error === 'SANDBOX_RESTRICTION') {
          alert("AVISO DE E-MAIL: O usuário foi aprovado, mas o e-mail não foi enviado devido à restrição de teste (Sandbox) do Resend. \n\nNo modo gratuito, você só pode enviar e-mails para o seu próprio endereço (ralysonriccelli@gmail.com). \n\nPara enviar para outros usuários, você precisa verificar um domínio em resend.com/domains.");
        }
      }
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { 
        ...u, 
        name: editUserName, 
        role: editUserRole as any, 
        status: editUserStatus as any 
      } : u));
      
      setIsUserModalOpen(false);
      alert("Alterações salvas com sucesso!");
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
            GOVERNANÇA
          </h2>
          <p className="text-slate-500 font-bold mt-3 text-[10px] uppercase tracking-[0.4em]">
            Painel de Controle Central do Ecossistema
          </p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            OPERADORES {users.filter(u => u.status === 'pending').length > 0 && `(${users.filter(u => u.status === 'pending').length})`}
          </button>
          <button 
            onClick={() => setActiveTab('editais')}
            className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'editais' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            MATRIZES CORE
          </button>
        </div>

        <div className="flex gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2 flex items-center gap-2">
            <Info size={14} className="text-amber-500" />
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Notificações em modo Simulação</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
            <input type="text" placeholder="PESQUISAR..." className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 font-black text-white text-[10px] tracking-widest uppercase transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={refreshData} disabled={isRefreshing} className="p-4 bg-white/5 border border-white/5 text-indigo-400 rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50">
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {activeTab === 'editais' && (
            <button 
              onClick={() => handleOpenEditalModal()}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
            >
              <Plus size={16} className="inline mr-2" /> NOVA MATRIZ
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-8">
          {/* DESTAQUE: USUÁRIOS AGUARDANDO APROVAÇÃO */}
          {users.filter(u => u.status === 'pending').length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Aguardando Ativação Manual</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.filter(u => u.status === 'pending').map(u => (
                  <div key={u.id} className="glass-card p-8 rounded-[2.5rem] border border-rose-500/30 bg-rose-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldCheck size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-black text-xl border border-rose-500/20">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black text-white uppercase tracking-tight truncate">{u.name}</p>
                        <p className="text-[9px] text-slate-500 font-bold truncate">{u.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleQuickStatusUpdate(u.id, 'active')}
                      disabled={loadingId === u.id}
                      className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3"
                    >
                      {loadingId === u.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      APROVAR ACESSO AGORA
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && !isRefreshing && (
            <div className="p-20 text-center glass-card rounded-[3rem] border border-dashed border-white/10">
              <RefreshCw size={40} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Nenhum operador encontrado no ecossistema</p>
              <button onClick={refreshData} className="mt-6 text-indigo-400 font-black text-[9px] uppercase tracking-widest hover:text-indigo-300">Sincronizar Banco de Dados</button>
            </div>
          )}
          {filteredUsers.length > 0 && (
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
                            <div className="flex items-center gap-2 mt-2">
                               <Clock size={10} className="text-slate-700" />
                               <span className="text-[8px] font-black text-slate-700 uppercase tracking-tighter">
                                 {(u as any).totalStudyTime ? `${Math.floor((u as any).totalStudyTime / 60)}h ${(u as any).totalStudyTime % 60}m` : '0h 0m'}
                               </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <select 
                          value={u.role} 
                          onChange={(e) => handleQuickRoleUpdate(u.id, e.target.value)}
                          disabled={loadingId === u.id || u.id === user.id}
                          className="bg-white/5 border border-white/5 rounded-lg text-[8px] font-black uppercase text-indigo-400 px-3 py-1.5 outline-none focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <option value="student">ESTUDANTE</option>
                          <option value="mentor">MENTOR</option>
                          <option value="administrator">ADMIN</option>
                        </select>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                              u.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              u.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                              'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              {u.status === 'active' ? <CheckCircle2 size={10}/> : u.status === 'pending' ? <Timer size={10}/> : <Ban size={10}/>}
                              {u.status?.toUpperCase() || 'ATIVO'}
                            </span>
                            
                            {u.status === 'pending' && (
                              <button 
                                onClick={() => handleQuickStatusUpdate(u.id, 'active')}
                                disabled={loadingId === u.id}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                              >
                                {loadingId === u.id ? <Loader2 size={10} className="animate-spin" /> : <ShieldCheck size={10} />}
                                APROVAR AGORA
                              </button>
                            )}
    
                            {u.status === 'active' && u.id !== user.id && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleQuickStatusUpdate(u.id, 'blocked')}
                                  disabled={loadingId === u.id}
                                  className="p-2 bg-rose-500/20 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                  title="Bloquear Usuário"
                                >
                                  <Ban size={14} />
                                </button>
                                <button 
                                  onClick={() => handleQuickStatusUpdate(u.id, 'pending')}
                                  disabled={loadingId === u.id}
                                  className="p-2 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                                  title="Mover para Pendente"
                                >
                                  <Timer size={14} />
                                </button>
                              </div>
                            )}
    
                            {u.status === 'blocked' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleQuickStatusUpdate(u.id, 'active')}
                                  disabled={loadingId === u.id}
                                  className="p-2 bg-indigo-500/20 text-indigo-500 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
                                  title="Desbloquear Usuário"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button 
                                  onClick={() => handleQuickStatusUpdate(u.id, 'pending')}
                                  disabled={loadingId === u.id}
                                  className="p-2 bg-amber-500/20 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                                  title="Mover para Pendente"
                                >
                                  <Timer size={14} />
                                </button>
                              </div>
                            )}
                         </div>
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
          )}
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

      {/* MODAL DE EDIÇÃO DE USUÁRIO */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[3.5rem] p-12 border border-white/10 shadow-2xl relative">
             <button onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
             
             <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">GESTÃO DE PERFIL</h3>
                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em]">Controle de Acesso</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NOME DO OPERADOR</label>
                  <input type="text" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" value={editUserName} onChange={e => setEditUserName(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NÍVEL DE ACESSO</label>
                    <select className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold text-xs" value={editUserRole} onChange={e => setEditUserRole(e.target.value as any)}>
                      <option value="student">ESTUDANTE</option>
                      <option value="mentor">MENTOR</option>
                      <option value="administrator">ADMIN</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SITUAÇÃO</label>
                    <select className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold text-xs" value={editUserStatus} onChange={e => setEditUserStatus(e.target.value as any)}>
                      <option value="active">ATIVO</option>
                      <option value="pending">PENDENTE</option>
                      <option value="blocked">BLOQUEADO</option>
                    </select>
                  </div>
                </div>
             </div>

             <button 
               onClick={handleSaveUser} 
               disabled={loadingId === editingUser.id}
               className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl mt-10 flex items-center justify-center gap-3"
             >
               {loadingId === editingUser.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
               SALVAR ALTERAÇÕES
             </button>
          </div>
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

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NOME DO CONCURSO</label>
                    <input type="text" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" placeholder="EX: POLÍCIA FEDERAL 2024" value={editalForm.name} onChange={e => setEditalForm({...editalForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ÓRGÃO / BANCA</label>
                    <input type="text" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" placeholder="EX: PF / CEBRASPE" value={editalForm.organization} onChange={e => setEditalForm({...editalForm, organization: e.target.value})} />
                  </div>
                </div>
                
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">DATA DA PROVA (OPCIONAL)</label>
                   <input type="date" className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold" value={editalForm.examDate} onChange={e => setEditalForm({...editalForm, examDate: e.target.value})} />
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">DISCIPLINAS DA MATRIZ</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{editalSubjects.length} MATÉRIAS</span>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 relative">
                      <textarea 
                        placeholder="NOME DA DISCIPLINA (OU COLE VÁRIAS SEPARADAS POR VÍRGULA)..." 
                        className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 text-white font-bold text-[10px] uppercase resize-none h-[58px] custom-scrollbar"
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddSubject();
                          }
                        }}
                      />
                    </div>
                    <button 
                      onClick={handleAddSubject}
                      className="h-[58px] px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editalSubjects.map(sub => (
                      <div key={sub.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => setExpandedSubjectId(expandedSubjectId === sub.id ? null : sub.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: sub.color }} />
                            <span className="text-[10px] font-black text-white uppercase tracking-tight">{sub.name}</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">({sub.topics.length} tópicos)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveSubject(sub.id); }}
                              className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {expandedSubjectId === sub.id && (
                          <div className="p-4 bg-black/20 border-t border-white/5 space-y-4">
                            <div className="flex flex-col gap-2">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                ADICIONAR TÓPICOS (COLE DA PLANILHA)
                              </label>
                              
                              <div className="flex gap-2">
                                <textarea 
                                  placeholder="COLE OS TÓPICOS (1 POR LINHA OU SEPARADOS POR PONTO E VÍRGULA)..." 
                                  className="flex-1 px-4 py-3 bg-black/40 border border-white/5 rounded-xl outline-none focus:border-indigo-500 text-white font-bold text-[9px] uppercase min-h-[80px] resize-none custom-scrollbar"
                                  value={newTopicTitle}
                                  onChange={e => setNewTopicTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleAddTopic(sub.id);
                                    }
                                  }}
                                />
                                <button 
                                  onClick={() => handleAddTopic(sub.id)}
                                  className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              <p className="text-[7px] text-slate-600 font-bold uppercase tracking-tight ml-1">
                                Dica: O sistema limpa automaticamente numerações (1., 01-, etc) e separa por linhas.
                              </p>
                            </div>

                            <div className="space-y-2">
                              {sub.topics.map(topic => (
                                <div key={topic.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{topic.title}</span>
                                  <button 
                                    onClick={() => handleRemoveTopic(sub.id, topic.id)}
                                    className="text-slate-600 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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

      {/* MODAL DE DELEÇÃO DE USUÁRIO (PURGA) */}
      {showConfirmDelete && userToPurge && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[3.5rem] p-12 border border-rose-500/30 text-center">
             <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2.5rem] border border-rose-500/20 flex items-center justify-center mx-auto mb-8">
                <ShieldX size={44} />
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">EXPULSAR OPERADOR</h3>
             <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wide mb-10">
                Deseja remover permanentemente o acesso de <span className="text-white">"{userToPurge.name}"</span>? Esta ação é irreversível e apagará o perfil do banco de dados.
             </p>
             <div className="flex flex-col gap-4">
                <button 
                  onClick={handlePurgeUser} 
                  disabled={loadingId === userToPurge.id}
                  className="w-full bg-rose-600 text-white p-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl flex items-center justify-center gap-3"
                >
                  {loadingId === userToPurge.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  CONFIRMAR EXPULSÃO
                </button>
                <button onClick={() => { setShowConfirmDelete(false); setUserToPurge(null); }} className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] hover:text-white transition-colors">CANCELAR</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
