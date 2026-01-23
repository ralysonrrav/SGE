
import React, { useState } from 'react';
import { MockExam, Subject, User } from '../types';
import { supabase } from '../lib/supabase';
import { BarChart2, Plus, Trash2, TrendingUp, Award, FileText, X, Loader2 } from 'lucide-react';

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

    const tempId = `temp-${Date.now()}`;
    const newMock: MockExam = {
      id: tempId,
      user_id: user.id,
      title,
      date,
      score,
      totalQuestions: total,
      subjectPerformance: {}
    };

    setMocks(prev => [newMock, ...prev]);
    setShowAddForm(false);

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('mocks')
          .insert([{
            user_id: user.id,
            title,
            date,
            score,
            total_questions: total // Assumindo snake_case no banco
          }])
          .select()
          .single();

        if (error) {
          console.error("Erro ao salvar simulado:", error);
          setMocks(prev => prev.filter(m => m.id !== tempId));
          alert("Falha ao salvar simulado no banco.");
        } else if (data) {
          setMocks(prev => prev.map(m => m.id === tempId ? { ...data, id: String(data.id), totalQuestions: data.total_questions } : m));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTitle('');
    }
  };

  const removeMock = async (id: string) => {
    if (!window.confirm("Atenção: Deseja realmente excluir este simulado?")) return;
    const idToRemove = String(id);
    setMocks(prev => prev.filter(m => String(m.id) !== idToRemove));

    if (supabase && !idToRemove.startsWith('temp-')) {
      await supabase.from('mocks').delete().eq('id', idToRemove);
    }
  };

  const averageScore = mocks.length > 0 
    ? Math.round(mocks.reduce((acc, m) => acc + (m.score / (m.totalQuestions || 1)), 0) / mocks.length * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Simulados</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Acompanhe sua evolução e métricas de acerto.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          Cadastrar Resultado
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Média Geral</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{averageScore}%</h3>
            <TrendingUp size={24} className="text-emerald-500 mb-1" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Simulados Feitos</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{mocks.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Recorde Pessoal</p>
          <h3 className="text-3xl font-black text-emerald-600">
            {mocks.length > 0 ? Math.max(...mocks.map(m => Math.round((m.score / (m.totalQuestions || 1)) * 100))) : 0}%
          </h3>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 shadow-2xl animate-in zoom-in-95 duration-200 relative">
          <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl">
            <X size={20} />
          </button>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6">Novo Resultado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Simulado</label>
              <input type="text" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-950 dark:text-white font-bold text-sm" placeholder="Ex: Simulado PC-SP" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acertos</label>
              <input type="number" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-950 dark:text-white font-bold text-sm" value={score} onChange={(e) => setScore(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questões Totais</label>
              <input type="number" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-950 dark:text-white font-bold text-sm" value={total} onChange={(e) => setTotal(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
              <input type="date" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-950 dark:text-white font-bold text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button onClick={addMock} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2">
              {loading && <Loader2 className="animate-spin" size={18} />} SALVAR RESULTADO
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 px-8 py-3 font-bold hover:bg-slate-100 rounded-xl">CANCELAR</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acertos</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Eficiência</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {mocks.map(mock => {
              const perc = Math.round((mock.score / (mock.totalQuestions || 1)) * 100);
              return (
                <tr key={mock.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                        <FileText size={18} />
                      </div>
                      <span className="font-black text-slate-800 dark:text-slate-200">{mock.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-500">
                    {new Date(mock.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-black text-slate-600">
                    {mock.score} / {mock.totalQuestions}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      perc >= 80 ? 'bg-emerald-50 text-emerald-600' : 
                      perc >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {perc}%
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => removeMock(mock.id)} className="text-slate-300 hover:text-rose-500 p-2.5 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {mocks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                   <Award size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-400 font-bold uppercase text-xs">Nenhum simulado registrado</p>
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
