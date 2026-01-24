
import React, { useState, useEffect, useMemo } from 'react';
import { Subject, MockExam, StudyCycle, StudySession } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Clock, Target, Zap, ArrowUpRight, BarChart2, 
  Flag, Trophy, ChevronRight, User as UserIcon, Flame
} from 'lucide-react';

interface DashboardProps {
  subjects: Subject[];
  mocks: MockExam[];
  cycle: StudyCycle | null;
  studyLogs: StudySession[];
  weeklyGoal: number;
  onUpdateGoal: (hours: number) => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, mocks, studyLogs, weeklyGoal, onUpdateGoal }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const totalMinutes = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + (t.studyTimeMinutes || 0), 0), 0), [subjects]);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalTopics = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.length, 0), [subjects]);
  const completedTopics = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0), [subjects]);
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const thisWeekHours = useMemo(() => {
    const now = new Date();
    const lastSun = new Date(now);
    lastSun.setDate(now.getDate() - now.getDay());
    lastSun.setHours(0, 0, 0, 0);
    const mins = studyLogs.reduce((acc, log) => new Date(log.date) >= lastSun ? acc + log.minutes : acc, 0);
    return parseFloat((mins / 60).toFixed(1));
  }, [studyLogs]);

  const weeklyGoalPercent = Math.min(100, Math.round((thisWeekHours / weeklyGoal) * 100));
  const mockData = useMemo(() => mocks.map(m => ({ name: m.title.substring(0, 8), acerto: Math.round((m.score / m.totalQuestions) * 100) })).slice(-5).reverse(), [mocks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* "The Quest Path" - Linear Progression Trail */}
      <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden border-b-4 border-indigo-500/30">
        <div className="flex justify-between items-end mb-12">
           <div>
              <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                 <Flame className="text-orange-500 animate-pulse" /> TRILHA DA NOMEAÇÃO
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Status da Jornada: <span className="text-indigo-400">{progressPercent}% do Edital Concluído</span></p>
           </div>
           <div className="text-right">
              <span className="text-4xl font-black text-white text-glow">{progressPercent}%</span>
           </div>
        </div>

        <div className="relative h-24 flex items-center px-4">
           {/* Trail Line Base */}
           <div className="absolute left-10 right-10 h-1.5 bg-slate-900 rounded-full shadow-inner"></div>
           
           {/* Trail Progress (Glowing Line) */}
           <div 
             className="absolute left-10 h-1.5 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-[2000ms] ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]"
             style={{ width: `calc(${progressPercent}% - 0px)` }}
           ></div>

           {/* Start Flag */}
           <div className="absolute left-0 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500">
                 <Flag size={18} />
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Largada</span>
           </div>

           {/* Character Avatar (The Moving Piece) */}
           <div 
             className="absolute transition-all duration-[2000ms] ease-out z-20 flex flex-col items-center"
             style={{ left: `calc(${progressPercent}% - 20px)`, marginLeft: '20px' }}
           >
              <div className="relative">
                <div className="absolute -inset-2 bg-indigo-500/20 blur-lg rounded-full animate-pulse"></div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-float border-2 border-indigo-400">
                   <UserIcon className="text-indigo-600" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping"></div>
              </div>
              <span className="mt-2 text-[9px] font-black text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-tighter">Você</span>
           </div>

           {/* End Goal */}
           <div className="absolute right-0 flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${progressPercent === 100 ? 'bg-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-110' : 'bg-slate-900 text-slate-700 border border-white/5 opacity-50'}`}>
                 <Trophy size={24} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${progressPercent === 100 ? 'text-amber-500' : 'text-slate-600'}`}>Aprovação</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tempo Bruto', value: `${totalHours}h ${totalMinutes % 60}m`, icon: <Clock size={16}/>, color: 'text-indigo-400' },
          { label: 'Ritmo Semanal', value: `${thisWeekHours}h`, icon: <Zap size={16}/>, color: 'text-amber-400' },
          { label: 'Média Simulados', value: mocks.length > 0 ? `${Math.round(mocks[0].score / mocks[0].totalQuestions * 100)}%` : '0%', icon: <Target size={16}/>, color: 'text-emerald-400' },
          { label: 'Meta Batida', value: `${weeklyGoalPercent}%`, icon: <TrendingUp size={16}/>, color: 'text-sky-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 rounded-[2rem] border-l-4 border-indigo-500/20 hover:border-indigo-500 transition-all group">
             <div className="flex items-center gap-3 mb-6">
               <div className={`p-2 rounded bg-white/5 ${stat.color}`}>{stat.icon}</div>
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{stat.label}</span>
             </div>
             <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Evolution Chart Area */}
      <div className="glass-card rounded-[2.5rem] p-10">
          <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                  <ArrowUpRight className="text-indigo-400" /> ANÁLISE TÁTICA
               </h3>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Sessões de Performance Analítica</p>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[9px] font-black text-indigo-400 uppercase tracking-widest">Simulados</div>
            </div>
          </div>
          <div className="h-80 w-full">
            {isMounted && mockData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: '900' }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: '900' }} unit="%" />
                  <Tooltip contentStyle={{ background: '#070a19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#fff' }} />
                  <Area type="monotone" dataKey="acerto" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-4 opacity-50">
                <BarChart2 size={64} />
                <p className="font-black text-[10px] uppercase tracking-[0.5em]">Aguardando Ingestão de Dados</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
