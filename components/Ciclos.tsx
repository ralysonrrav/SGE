
import React, { useState } from 'react';
import { Subject, StudyCycle, User } from '../types';
import { BrainCircuit, Loader2, Calendar, Target, Clock, Zap } from 'lucide-react';
import { generateStudyCycle } from '../services/geminiService';
import { supabase } from '../lib/supabase';

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
      alert("Adicione disciplinas no Edital Vertical primeiro para que a IA possa planejar.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateStudyCycle(board, examDate, hoursPerDay, subjects);
      
      const newCycle: StudyCycle = {
        id: `cycle-${Date.now()}`,
        board,
        examDate,
        hoursPerDay,
        schedule: result.schedule
      };

      // Persistir no Supabase se houver conexão
      if (supabase && user.role !== 'visitor') {
        const { data, error } = await supabase.from('study_cycles').insert([{
          user_id: user.id,
          board: newCycle.board,
          exam_date: newCycle.examDate,
          hours_per_day: newCycle.hoursPerDay,
          schedule: newCycle.schedule
        }]).select().single();

        if (error) console.error("Erro ao salvar ciclo:", error);
        if (data) newCycle.id = String(data.id);
      }

      setCycle(newCycle);
      localStorage.setItem('sf_cache_cycle', JSON.stringify(newCycle));
      alert("Cronograma gerado e salvo com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Houve um erro ao gerar o ciclo. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Ciclos</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Cronograma inteligente baseado no custo-benefício de cada matéria.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6 h-fit">
          <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[10px] tracking-widest">
            <Zap size={18} />
            <span>Configuração do Plano</span>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banca Examinadora</label>
              <select 
                className="w-full px-5 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold transition-all"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                {boards.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Prova</label>
              <input 
                type="date"
                className="w-full px-5 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold transition-all"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Diárias</label>
              <input 
                type="number"
                min="1"
                max="24"
                className="w-full px-5 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold transition-all"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseInt(e.target.value))}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`
                w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95
                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
              `}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
              {loading ? 'Sincronizando com a IA...' : 'GERAR CRONOGRAMA'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!cycle && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-800 p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Calendar size={40} />
              </div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Configure ao lado para carregar seu plano</p>
            </div>
          )}

          {loading && (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-20 text-center animate-pulse">
              <BrainCircuit className="mx-auto mb-6 text-indigo-200" size={64} />
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Analisando disciplinas da banca {board}...</h3>
              <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-widest">Calculando melhor custo-benefício...</p>
            </div>
          )}

          {cycle && !loading && (
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Seu Plano Semanal</h3>
                <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">Pareto 80/20</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cycle.schedule.map((dayPlan, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                    <h4 className="font-black text-indigo-600 uppercase text-[10px] tracking-[0.3em] mb-6 border-b border-indigo-50 dark:border-indigo-900/30 pb-4">{dayPlan.day}</h4>
                    <div className="space-y-4">
                      {dayPlan.sessions.map((session, sIdx) => (
                        <div key={sIdx} className="flex justify-between items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{session.subjectName}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{session.focus}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
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
