
import React, { useState } from 'react';
import { MockExam, Subject } from '../types';
import { supabase } from '../lib/supabase';
import { BarChart2, Plus, Trash2, TrendingUp, Award, FileText, X, Loader2 } from 'lucide-react';

interface SimuladosProps {
  mocks: MockExam[];
  setMocks: React.Dispatch<React.SetStateAction<MockExam[]>>;
  subjects: Subject[];
}

const Simulados: React.FC<SimuladosProps> = ({ mocks, setMocks, subjects }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(100);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const addMock = async () => {
    if (!title.trim()) {
      alert("Por favor, dê um nome ao simulado.");
      return;
    }
    
    setLoading(true);

    try {
      if (supabase) {
        // Mapeia para snake_case esperado no banco de dados
        const newMockPayload = {
          title: title.trim(),
          date,
          score,
          total_questions: total,
          subject_performance: {}
        };

        const { data, error } = await supabase
          .from('mocks')
          .insert([newMockPayload])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const formattedMock: MockExam = {
            ...data,
            id: String(data.id),
            totalQuestions: data.total_questions,
            subjectPerformance: data.subject_performance || {}
          };
          setMocks(prev => [formattedMock, ...prev]);
        }
      } else {
        // Fallback local caso Supabase falhe na conexão
        const newMock: MockExam = {
          id: Date.now().toString(),
          title,
          date,
          score,
          totalQuestions: total,
          subjectPerformance: {}
        };
        setMocks(prev => [newMock, ...prev]);
      }

      setShowAddForm(false);
      setTitle('');
      setScore(0);
      setTotal(100);
    } catch (err: any) {
      console.error("Erro ao salvar simulado:", err);
      alert(`Erro no registro: ${err.message || "Tente novamente mais tarde."}`);
    } finally {
      setLoading(false);
    }
  };

  const removeMock = async (id: string) => {
    if (!window.confirm("Atenção: Deseja realmente excluir os dados deste simulado permanentemente?")) return;
    
    const idToRemove = String(id);
    
    // Atualização Otimista
    setMocks(prev => prev.filter(m => String(m.id) !== idToRemove));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('mocks')
          .delete()
          .eq('id', idToRemove);
        
        if (error) throw error;
      } catch (err: any) {
        console.error("Erro ao excluir simulado do banco:", err);
        alert("Erro ao sincronizar exclusão com o servidor. Recarregue a página.");
      }
    }
  };

  const averageScore = mocks.length > 0 
    ? Math.round(mocks.reduce((acc, m) => acc + (m.score / m.totalQuestions), 0) / mocks.length * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Estatísticas de Simulados</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Acompanhe sua evolução e métricas de acerto.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Plus size={20} />
          Cadastrar Resultado
        </button>
      </header>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Média Geral de Acertos</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 transition-colors">{averageScore}%</h3>
            <TrendingUp size={24} className="text-emerald-500 dark:text-emerald-400 mb-1 transition-colors" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Total de Simulados</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 transition-colors">{mocks.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Melhor Desempenho</p>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">
            {mocks.length > 0 ? Math.max(...mocks.map(m => Math.round((m.score / m.totalQuestions) * 100))) : 0}%
          </h3>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 shadow-2xl animate-in zoom-in-95 duration-200 transition-all relative">
          <button 
            onClick={() => setShowAddForm(false)} 
            className="absolute top-6 right-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-xl bg-slate-50 dark:bg-slate-800"
          >
            <X size={20} />
          </button>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 transition-colors">Cadastrar Novo Resultado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título / Nome</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-all font-bold text-sm"
                placeholder="Ex: Simulado 01"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questões Corretas</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-all font-bold text-sm"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Questões</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-all font-bold text-sm"
                value={total}
                onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Realização</label>
              <input 
                type="date" 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-all font-bold text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={addMock}
              disabled={loading}
              className="bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all w-full md:w-auto shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'SALVAR RESULTADO'}
            </button>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 dark:text-slate-400 px-8 py-3 font-bold transition-colors w-full md:w-auto hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Simulado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Acertos</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Eficiência</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right transition-colors">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            {mocks.map(mock => {
              const perc = Math.round((mock.score / mock.totalQuestions) * 100);
              return (
                <tr key={mock.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors">
                        <FileText size={18} />
                      </div>
                      <span className="font-black text-slate-800 dark:text-slate-200 transition-colors">{mock.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-500 dark:text-slate-500 transition-colors">
                    {new Date(mock.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-black text-slate-600 dark:text-slate-400 transition-colors">
                    {mock.score} / {mock.totalQuestions}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shadow-sm ${
                      perc >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      perc >= 60 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {perc}%
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => removeMock(mock.id)}
                      className="text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-all p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      title="Excluir Simulado"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {mocks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 dark:text-slate-600 transition-colors">
                  <div className="flex flex-col items-center">
                    <Award size={48} className="opacity-10 mb-4" />
                    <p className="font-bold uppercase text-[10px] tracking-widest">Nenhum simulado registrado</p>
                  </div>
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
