
import React, { useState } from 'react';
import { MockExam, Subject, User } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, TrendingUp, Target, X, Loader2, BarChart3, Award } from 'lucide-react';

interface SimuladosProps {
  user: User;
  mocks: MockExam[];
  setMocks: React.Dispatch<React.SetStateAction<MockExam[]>>;
  subjects: Subject[];
}

const Simulados: React.FC<SimuladosProps> = ({ user, mocks, setMocks, subjects }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(100);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const addMock = async () => {
    if (!title.trim()) return;
    setLoading(true);
    let finalId = `local-${Date.now()}`;
    try {
      if (supabase && user.role !== 'visitor') {
        const { data } = await supabase.from('mocks').insert([{ 
          title: title.trim(), date, score, total_questions: total, 
          subject_performance: {}, user_id: user.id 
        }]).select().single();
        if (data) finalId = String(data.id);
      }
    } catch (err: any) {
    } finally {
      const newMock: MockExam = { id: finalId, title, date, score, totalQuestions: total, subjectPerformance: {} };
      setMocks(prev => [newMock, ...prev]);
      setShowAddForm(false);
      setTitle(''); setScore(0); setTotal(100);
      setLoading(false);
    }
  };

  const removeMock = async (id: string) => {
    if (!window.confirm("Excluir este simulado?")) return;
    const idToRemove = String(id);
    setMocks(prev => prev.filter(m => String(m.id) !== idToRemove));
    if (supabase && !idToRemove.startsWith('local-')) {
      try { await supabase.from('mocks').delete().eq('id', idToRemove).eq('user_id', user.id); } catch (e) {}
    }
  };

  const averageScore = mocks.length > 0 
    ? Math.round(mocks.reduce((acc, m) => acc + (m.score / m.totalQuestions), 0) / mocks.length * 100)
    : 0;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">ESTATÍSTICAS DE COMBATE</h2>
          <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Análise Crítica de Performance em Simulados</p>
        </div>
        <button onClick={() => setShowAddForm(true)} disabled={loading} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50">
          <Plus size={16} /> REGISTRAR RESULTADO
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-10 rounded-[2.5rem] border-l-4 border-l-indigo-600">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">EFICIÊNCIA MÉDIA</p>
          <div className="flex items-end gap-3">
            <h3 className="text-5xl font-black text-white tracking-tighter">{averageScore}%</h3>
            <TrendingUp size={24} className="text-emerald-500 mb-2" />
          </div>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] border-l-4 border-l-amber-600">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">TOTAL DE MISSÕES</p>
          <h3 className="text-5xl font-black text-white tracking-tighter">{mocks.length}</h3>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">RECORDE PESSOAL</p>
          <div className="flex items-end gap-3">
             <h3 className="text-5xl font-black text-emerald-500 tracking-tighter">
               {mocks.length > 0 ? Math.max(...mocks.map(m => Math.round((m.score / m.totalQuestions) * 100))) : 0}%
             </h3>
             <Award size={24} className="text-amber-500 mb-2" />
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="glass-card p-10 rounded-[2.5rem] animate-in slide-in-from-top-4 relative border-t-4 border-indigo-600">
          <button onClick={() => setShowAddForm(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">NOVO REGISTRO DE PERFORMANCE</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">IDENTIFICAÇÃO</label>
              <input type="text" placeholder="EX: PF 2024 - CEBRASPE" className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl outline-none font-black text-white text-xs uppercase" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">ACERTOS LÍQUIDOS</label>
              <input type="number" className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl outline-none font-black text-white text-xs" value={score || ''} onChange={(e) => setScore(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">TOTAL DE ITENS</label>
              <input type="number" className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl outline-none font-black text-white text-xs" value={total || ''} onChange={(e) => setTotal(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA DE EXECUÇÃO</label>
              <input type="date" className="w-full px-5 py-4 bg-black/40 border border-white/10 rounded-xl outline-none font-black text-white text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 mt-10 pt-8 border-t border-white/5">
            <button onClick={addMock} disabled={loading} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'CONSOLIDAR DADOS'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 font-black text-[10px] uppercase tracking-widest px-4 py-4">CANCELAR</button>
          </div>
        </div>
      )}

      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5">
              <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">IDENTIFICAÇÃO</th>
              <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">DATA</th>
              <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">EFICIÊNCIA</th>
              <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mocks.map(mock => {
              const perc = Math.round((mock.score / mock.totalQuestions) * 100);
              return (
                <tr key={mock.id} className="hover:bg-white/5 transition-all">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <Target size={18} className="text-indigo-400" />
                      <span className="font-black text-white text-sm uppercase tracking-tight">{mock.title}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center text-[10px] font-black text-slate-500">{new Date(mock.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-10 py-6 text-center">
                    <span className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${perc >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {perc}% ACERTO
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button onClick={() => removeMock(mock.id)} className="text-slate-600 hover:text-rose-500 transition-colors p-2"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
            {mocks.length === 0 && (
              <tr>
                <td colSpan={4} className="py-24 text-center text-slate-800 font-black uppercase text-[10px] tracking-[0.5em] italic">
                  Aguardando Registro de Atividades
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Simulados;
