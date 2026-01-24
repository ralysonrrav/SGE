
import React, { useState } from 'react';
import { Subject, StudyCycle, User } from '../types';
import { BrainCircuit, Loader2, Calendar, Clock, Zap } from 'lucide-react';
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
      alert("Adicione disciplinas no Edital Vertical primeiro.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateStudyCycle(board, examDate, hoursPerDay, subjects);
      const newCycle: StudyCycle = { id: `cycle-${Date.now()}`, board, examDate, hoursPerDay, schedule: result.schedule };

      if (supabase && user.role !== 'visitor') {
        const { data } = await supabase.from('study_cycles').insert([{
          user_id: user.id, board: newCycle.board, exam_date: newCycle.examDate,
          hours_per_day: newCycle.hoursPerDay, schedule: newCycle.schedule
        }]).select().single();
        if (data) newCycle.id = String(data.id);
      }
      setCycle(newCycle);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase">PLANEJAMENTO ESTRATÉGICO</h2>
        <p className="text-slate-500 font-bold mt-2 text-[10px] uppercase tracking-[0.4em]">Algoritmo de Distribuição por Custo-Benefício</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 glass-card p-10 rounded-[2.5rem] space-y-8 h-fit border-l-4 border-l-indigo-600">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">BANCA ALVO</label>
              <select className="w-full px-5 py-4 border border-white/5 rounded-xl bg-black/40 text-white font-black text-xs outline-none focus:border-indigo-500" value={board} onChange={(e) => setBoard(e.target.value)}>
                {boards.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">DATA DA PROVA</label>
              <input type="date" className="w-full px-5 py-4 border border-white/5 rounded-xl bg-black/40 text-white font-black text-xs outline-none focus:border-indigo-500" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">HORAS DIÁRIAS</label>
              <input type="number" className="w-full px-5 py-4 border border-white/5 rounded-xl bg-black/40 text-white font-black text-xs outline-none focus:border-indigo-500" value={hoursPerDay} onChange={(e) => setHoursPerDay(parseInt(e.target.value))} />
            </div>
            <button onClick={handleGenerate} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black text-[10px] tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
              {loading ? 'CALCULANDO...' : 'EXECUTAR ALGORITMO'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!cycle && !loading ? (
             <div className="glass-card rounded-[2.5rem] p-20 text-center border-dashed border-white/5">
                <Calendar className="mx-auto text-slate-800 mb-4" size={48} />
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em]">Aguardando Definição de Parâmetros</p>
             </div>
          ) : loading ? (
             <div className="glass-card rounded-[2.5rem] p-20 text-center animate-pulse border-indigo-500/20">
                <BrainCircuit className="mx-auto text-indigo-500/30 mb-6" size={64} />
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">PROCESSANDO DISCIPLINAS...</h3>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cycle?.schedule.map((day, idx) => (
                  <div key={idx} className="glass-card p-10 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">{day.day}</h4>
                    <div className="space-y-4">
                      {day.sessions.map((s, si) => (
                        <div key={si} className="bg-black/40 p-5 rounded-2xl flex justify-between items-center border border-white/5 group-hover:border-white/10 transition-colors">
                           <div>
                              <p className="text-xs font-black text-white uppercase tracking-wider">{s.subjectName}</p>
                              <p className="text-[9px] text-slate-500 font-black mt-1 uppercase tracking-widest">{s.focus}</p>
                           </div>
                           <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 font-black text-[10px]">
                              <Clock size={12}/> {s.duration}m
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ciclos;
