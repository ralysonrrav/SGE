
import React, { useState } from 'react';
import { MockExam, Subject } from '../types';
import { BarChart2, Plus, Trash2, TrendingUp, Award, FileText, X } from 'lucide-react';

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

  const addMock = () => {
    if (!title.trim()) return;
    const newMock: MockExam = {
      id: Date.now().toString(),
      title,
      date,
      score,
      totalQuestions: total,
      subjectPerformance: {}
    };
    setMocks([...mocks, newMock]);
    setShowAddForm(false);
    setTitle('');
  };

  const removeMock = (id: string) => {
    setMocks(mocks.filter(m => m.id !== id));
  };

  const averageScore = mocks.length > 0 
    ? Math.round(mocks.reduce((acc, m) => acc + (m.score / m.totalQuestions), 0) / mocks.length * 100)
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Estatísticas de Simulados</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Mensure seu desempenho e identifique gargalos.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all flex items-center justify-center gap-2 shadow-lg dark:shadow-none"
        >
          <Plus size={20} />
          Novo Simulado
        </button>
      </header>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Média Geral</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 transition-colors">{averageScore}%</h3>
            <TrendingUp size={24} className="text-emerald-500 dark:text-emerald-400 mb-1 transition-colors" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Total Realizados</p>
          <h3 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 transition-colors">{mocks.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 transition-colors">Melhor Score</p>
          <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 transition-colors">
            {mocks.length > 0 ? Math.max(...mocks.map(m => Math.round((m.score / m.totalQuestions) * 100))) : 0}%
          </h3>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-xl dark:shadow-none animate-in zoom-in-95 duration-200 transition-colors relative">
          <button 
            onClick={() => setShowAddForm(false)} 
            className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 transition-colors">Cadastrar Simulado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">Título / Nome</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                placeholder="Ex: Simulado 01 - PDF Estratégia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">Acertos</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">Total Questões</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={total}
                onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">Data</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button 
              onClick={addMock}
              className="bg-indigo-600 dark:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all w-full md:w-auto shadow-lg dark:shadow-none"
            >
              Salvar Dados
            </button>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 dark:text-slate-400 px-8 py-3 font-semibold transition-colors w-full md:w-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Simulado</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Acertos / Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center transition-colors">Percentual</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right transition-colors">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
            {mocks.map(mock => {
              const perc = Math.round((mock.score / mock.totalQuestions) * 100);
              return (
                <tr key={mock.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors">
                        <FileText size={18} />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 transition-colors">{mock.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-slate-500 dark:text-slate-500 transition-colors">
                    {new Date(mock.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-bold text-slate-600 dark:text-slate-400 transition-colors">
                    {mock.score} / {mock.totalQuestions}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      perc >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
                      perc >= 60 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400'
                    }`}>
                      {perc}%
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => removeMock(mock.id)}
                      className="text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-rose-400 transition-colors p-2"
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
                    <Award size={48} className="opacity-20 mb-4" />
                    <p>Nenhum simulado cadastrado ainda.</p>
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
