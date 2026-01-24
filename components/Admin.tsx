
import React, { useState, useMemo } from 'react';
import { User, PredefinedEdital, Subject, Topic } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Edit3, X, Save, Search, User as UserIcon, Loader2, 
  Plus, UserPlus, ShieldCheck, ShieldAlert, CheckCircle2, Ban,
  FileText, Database, Calendar, Globe
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
  if (user.role !== 'administrator') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10">
        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6"><Ban size={40} /></div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">ACESSO NEGADO</h2>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // States para Editais
  const [isEditalModalOpen, setIsEditalModalOpen] = useState(false);
  const [editingEdital, setEditingEdital] = useState<PredefinedEdital | null>(null);
  const [editalName, setEditalName] = useState('');
  const [editalOrg, setEditalOrg] = useState('');
  const [editalDate, setEditalDate] = useState('');

  // Sincronização de Editais
  const handleSaveEdital = async () => {
    if (!editalName || !editalOrg || !supabase) return;
    setLoadingId('save-edital');
    
    const payload = {
      name: editalName,
      organization: editalOrg,
      exam_date: editalDate,
      subjects: editingEdital?.subjects || [],
      last_updated: new Date().toISOString()
    };

    try {
      if (editingEdital) {
        const { data, error } = await supabase.from('predefined_editais').update(payload).eq('id', editingEdital.id).select().single();
        if (error) throw error;
        setEditais(prev => prev.map(e => e.id === editingEdital.id ? { ...data, id: String(data.id), examDate: data.exam_date, lastUpdated: data.last_updated } : e));
      } else {
        const { data, error } = await supabase.from('predefined_editais').insert([payload]).select().single();
        if (error) throw error;
        setEditais(prev => [{ ...data, id: String(data.id), examDate: data.exam_date, lastUpdated: data.last_updated }, ...prev]);
      }
      setIsEditalModalOpen(false);
      setEditingEdital(null);
      setEditalName(''); setEditalOrg(''); setEditalDate('');
    } catch (e) {
      alert("Erro ao salvar edital.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteEdital = async (id: string) => {
    if (!window.confirm("Apagar permanentemente esta matriz?") || !supabase) return;
    setLoadingId(id);
    try {
      await supabase.from('predefined_editais').delete().eq('id', id);
      setEditais(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert("Erro ao deletar.");
    } finally {
      setLoadingId(null);
    }
  };

  if (view === 'editais') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">CORE EDITAIS</h2>
            <p className="text-slate-500 font-bold mt-3 text-[10px] uppercase tracking-[0.4em]">Gestão de Matrizes Predefinidas</p>
          </div>
          <button onClick={() => { setEditingEdital(null); setEditalName(''); setEditalOrg(''); setEditalDate(''); setIsEditalModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl">
            <Plus size={16} className="inline mr-2" /> NOVA MATRIZ
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {editais.map(e => (
            <div key={e.id} className="glass-card p-8 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <Database size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingEdital(e); setEditalName(e.name); setEditalOrg(e.organization); setEditalDate(e.examDate || ''); setIsEditalModalOpen(true); }} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-indigo-400"><Edit3 size={14}/></button>
                    <button onClick={() => handleDeleteEdital(e.id)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
                  </div>
               </div>
               <h3 className="font-black text-white uppercase text-lg leading-tight mb-2">{e.name}</h3>
               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6">{e.organization}</p>
               <div className="flex items-center justify-between pt-6 border-t border-white/5">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Calendar size={12}/> {e.examDate || 'A definir'}
                 </div>
                 <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                   {e.subjects.length} DISCIPLINAS
                 </div>
               </div>
            </div>
          ))}
          {editais.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card rounded-[2rem] border-dashed">
               <Database size={48} className="mx-auto text-slate-800 mb-4" />
               <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Nenhuma matriz cadastrada no Core.</p>
            </div>
          )}
        </div>

        {isEditalModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
            <div className="glass-card w-full max-w-lg rounded-[3rem] p-12 border border-white/10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{editingEdital ? 'EDITAR MATRIZ' : 'CRIAR MATRIZ'}</h3>
                <button onClick={() => setIsEditalModalOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={32}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">NOME DO CERTAME</label>
                  <input value={editalName} onChange={e=>setEditalName(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white text-xs outline-none focus:border-indigo-500 uppercase" placeholder="Ex: PF 2024 - Agente" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">ORGANIZAÇÃO / BANCA</label>
                  <input value={editalOrg} onChange={e=>setEditalOrg(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white text-xs outline-none focus:border-indigo-500 uppercase" placeholder="Ex: CEBRASPE" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA PREVISTA</label>
                  <input type="date" value={editalDate} onChange={e=>setEditalDate(e.target.value)} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white text-xs outline-none focus:border-indigo-500" />
                </div>
                <button onClick={handleSaveEdital} disabled={!!loadingId} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex justify-center items-center gap-3 mt-6">
                  {loadingId === 'save-edital' ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} SALVAR MATRIZ NO CORE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render original User Management if view === 'users'
  const filteredUsers = useMemo(() => users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">GOVERNANÇA</h2>
          <p className="text-slate-500 font-bold mt-3 text-[10px] uppercase tracking-[0.4em]">Controle de Acessos ao Sistema</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
            <input type="text" placeholder="BUSCAR OPERADOR..." className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-indigo-500 font-black text-white text-[10px] tracking-widest uppercase transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </header>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">OPERADOR</th>
              <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest">NÍVEL</th>
              <th className="px-10 py-7 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">{u.name?.charAt(0)}</div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{u.name}</p>
                      <p className="text-[9px] text-slate-600 font-bold mt-1">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border ${u.role === 'administrator' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-indigo-400 rounded-xl"><Edit3 size={14}/></button>
                    <button className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-rose-500 rounded-xl"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
