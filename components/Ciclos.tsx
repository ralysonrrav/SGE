
import React, { useState } from 'react';
import { Subject, StudyCycle, User } from '../types';
import { BrainCircuit, Loader2, Calendar, Target, Clock, Zap } from 'lucide-react';
import { generateStudyCycle } from '../services/geminiService';

interface CiclosProps {
  user: User;
  subjects: Subject[];
  cycle: StudyCycle | null;
  setCycle: React.Dispatch<React.SetStateAction<StudyCycle | null>>;
}

const Ciclos: React.FC<CiclosProps> = ({ user, subjects, cycle, setCycle }) => {
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState('Cebraspe');
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(4);

  const boards = ['Cebraspe', 'FGV', 'Vunesp', 'FCC', 'Outra'];

  const handleGenerate = async () => {
    if (subjects.length === 0) {
      alert("Adicione disciplinas primeiro!");
      return;
    }
    setLoading(true);
    try {
      const result = await generateStudyCycle(board, examDate, hoursPerDay, subjects);
      // Fix: Added missing user_id property required by StudyCycle type
      const newCycle: StudyCycle = {
        id: Date.now().toString(),
        user_id: user.id,
        board,
        examDate,
        hoursPerDay,
        schedule: result.schedule
      };
      setCycle(newCycle);
    } catch (error) {
      alert("Houve um erro ao gerar o ciclo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Ciclos de Estudo AI</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Nossa inteligência artificial cria o cronograma perfeito baseado em Pareto.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 h-fit transition-colors">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <Zap size={20} />
            <span>Configuração do Plano</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Banca Examinadora</label>
              <select 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                {boards.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Data da Prova</label>
              <input 
                type="date"
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Horas por Dia</label>
              <input 
                type="number"
                min="1"
                max="24"
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 dark:text-white transition-colors"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseInt(e.target.value))}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition-all
                ${loading ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed' : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-indigo-100 dark:shadow-none'}
              `}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
              {loading ? 'Otimizando Ciclos...' : 'Gerar Cronograma IA'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!cycle && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center transition-colors">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600 transition-colors">
                <Calendar size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Configure as informações ao lado e clique em "Gerar" para ver seu plano personalizado.</p>
            </div>
          )}

          {loading && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center animate-pulse transition-colors">
              <BrainCircuit className="mx-auto mb-4 text-indigo-200 dark:text-indigo-800 transition-colors" size={48} />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Analisando tendências da banca {board}...</h3>
              <p className="text-slate-400 dark:text-slate-500 mt-2 transition-colors">Nossa IA está calculando o melhor custo-benefício para seus estudos.</p>
            </div>
          )}

          {cycle && !loading && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Seu Plano Semanal (Banca: {cycle.board})</h3>
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase transition-colors">Baseado em Pareto 80/20</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cycle.schedule.map((dayPlan, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:-translate-y-1">
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-3 border-b border-indigo-50 dark:border-indigo-900/30 pb-2 transition-colors">{dayPlan.day}</h4>
                    <div className="space-y-3">
                      {dayPlan.sessions.map((session, sIdx) => (
                        <div key={sIdx} className="flex justify-between items-start gap-4 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{session.subjectName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 font-medium transition-colors">{session.focus}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-600 transition-colors">
                            <Clock size={12} />
                            {session.duration}m
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ciclos;
