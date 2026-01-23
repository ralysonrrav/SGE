
import React, { useState } from 'react';
import { MockExam, Subject, User } from '../types';
import { supabase, isNetworkError } from '../lib/supabase';
import { Plus, Trash2, TrendingUp, FileText, X, Loader2 } from 'lucide-react';

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
        const { data, error } = await supabase
          .from('mocks')
          .insert([{ 
            title: title.trim(), 
            date, 
            score, 
            total_questions: total, // Nome exato da coluna no SQL
            subject_performance: {}, // Nome exato da coluna no SQL
            user_id: user.id 
          }])
          .select()
          .single();

        if (error) {
          console.error("Erro Supabase Simulados:", error);
          alert("Erro ao salvar simulado: " + error.message);
          throw error;
        }
        if (data) finalId = String(data.id);
      }
    } catch (err: any) {
      if (!isNetworkError(err)) {
        console.warn("Erro ao salvar simulado:", err.message);
      }
    } finally {
      const newMock: MockExam = { id: finalId, title, date, score, totalQuestions: total, subjectPerformance: {} };
      setMocks(prev => [newMock, ...prev]);
      setShowAddForm(false);
      setTitle('');
      setScore(0);
      setTotal(100);
      setLoading(false);
    }
  };

  const removeMock = async (id: string) => {
    if (!window.confirm("Excluir este simulado?")) return;
    const idToRemove = String(id);
    setMocks(prev => prev.filter(m => String(m.id) !== idToRemove));

    if (supabase && !idToRemove.startsWith('local-')) {
      try { 
        await supabase.from('mocks').delete().eq('id', idToRemove).eq('user_id', user.id); 
      } 
      catch (err) { if (!isNetworkError(err)) console.error(err); }
    }
  };

  const averageScore = mocks.length > 0 
    ? Math.round(mocks.reduce((acc, m) => acc + (m.score / m.totalQuestions), 0) / mocks.length * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Estatísticas de Simulados</h2>
          <p className="text-slate-500">Acompanhe sua evolução e métricas de acerto.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
          <Plus size={20} /> Cadastrar Resultado
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média Geral</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-indigo-600">{averageScore}%</h3>
            <TrendingUp size={24} className="text-emerald-500 mb-1" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">{mocks.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Melhor Nota</p>
          <h3 className="text-3xl font-black text-emerald-600">
            {mocks.length > 0 ? Math.max(...mocks.map(m => Math.round((m.score / m.totalQuestions) * 100))) : 0}%
          </h3>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border shadow-2xl relative animate-in slide-in-from-top-4">
          <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-slate-400 p-2"><X size={20} /></button>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Novo Resultado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Simulado</label>
              <input type="text" placeholder="Ex: PF 2024" className="w-full px-4 py-3 border rounded-xl outline-none font-bold bg-white dark:bg-slate-950 dark:text-white" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acertos</label>
              <input type="number" placeholder="Acertos" className="w-full px-4 py-3 border rounded-xl outline-none font-bold bg-white dark:bg-slate-950 dark:text-white" value={score || ''} onChange={(e) => setScore(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Itens</label>
              <input type="number" placeholder="Total" className="w-full px-4 py-3 border rounded-xl outline-none font-bold bg-white dark:bg-slate-950 dark:text-white" value={total || ''} onChange={(e) => setTotal(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
              <input type="date" className="w-full px-4 py-3 border rounded-xl outline-none font-bold bg-white dark:bg-slate-950 dark:text-white" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t dark:border-slate-800">
            <button onClick={addMock} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'SALVAR NO PERFIL'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 font-bold px-4 py-3">CANCELAR</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Eficiência</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {mocks.map(mock => {
              const perc = Math.round((mock.score / mock.totalQuestions) * 100);
              return (
                <tr key={mock.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-slate-400" />
                      <span className="font-black text-slate-800 dark:text-white">{mock.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-500">{new Date(mock.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${perc >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {perc}%
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => removeMock(mock.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
            {mocks.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-400 font-bold italic text-xs tracking-widest uppercase">
                  Nenhum simulado registrado
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
