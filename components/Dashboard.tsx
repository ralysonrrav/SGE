
import React, { useState, useEffect, useMemo } from 'react';
import { Subject, MockExam, StudyCycle, StudySession } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { CheckCircle2, TrendingUp, Clock, BookOpen, BarChart2, Zap, Settings, Target, Award, Calendar, ChevronRight } from 'lucide-react';

interface DashboardProps {
  subjects: Subject[];
  mocks: MockExam[];
  cycle: StudyCycle | null;
  studyLogs: StudySession[];
  weeklyGoal: number;
  onUpdateGoal: (hours: number) => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, mocks, cycle, studyLogs, weeklyGoal, onUpdateGoal, isDarkMode }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(weeklyGoal);
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

  const theme = {
    grid: isDarkMode ? '#1e293b' : '#f1f5f9',
    text: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#6366f1',
    bg: isDarkMode ? '#0f172a' : '#ffffff'
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none">Início</h2>
          <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] mt-4 flex items-center gap-2 uppercase tracking-[0.3em]">
            <Calendar size={12} className="text-indigo-500" /> STATUS DE HOJE: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-10 py-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-6 group hover:scale-[1.02] transition-transform">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Clock size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Acúmulo Líquido</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{totalHours}h <span className="text-sm text-slate-400 font-bold">{totalMinutes % 60}m</span></p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Weekly Productivity Card */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-14 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-16 relative">
            <div className="w-64 h-64 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="82" className="stroke-slate-50 dark:stroke-slate-800/50 fill-none" strokeWidth="16" />
                <circle 
                  cx="96" cy="96" r="82" 
                  className="stroke-indigo-600 dark:stroke-indigo-500 fill-none transition-all duration-1000 ease-in-out" 
                  strokeWidth="16"
                  strokeDasharray={2 * Math.PI * 82}
                  strokeDashoffset={(2 * Math.PI * 82) * (1 - weeklyGoalPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{weeklyGoalPercent}%</span>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-3">Meta Concluída</span>
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-4">
                  Progresso Semanal
                </h3>
                <button onClick={() => setIsEditingGoal(!isEditingGoal)} className="p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all">
                  <Settings size={22} />
                </button>
              </div>

              <p className="text-slate-500 dark:text-slate-400 font-bold text-xl leading-relaxed">
                Você dedicou <span className="text-indigo-600 dark:text-indigo-400 font-black">{thisWeekHours}h</span> à sua aprovação nesta semana. Restam <span className="text-slate-900 dark:text-slate-100 font-black">{Math.max(0, weeklyGoal - thisWeekHours)}h</span> para bater sua meta de {weeklyGoal}h.
              </p>

              {isEditingGoal && (
                <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                  <input type="number" className="flex-1 px-6 py-4 rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 font-black text-2xl outline-none focus:border-indigo-500 transition-all" value={tempGoal} onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)} />
                  <button onClick={() => { onUpdateGoal(tempGoal); setIsEditingGoal(false); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Salvar</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5 pt-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 transition-transform hover:-translate-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Eficiência</p>
                  <p className="font-black text-indigo-600 text-xl">{weeklyGoalPercent >= 90 ? 'Especialista' : 'Evoluindo'}</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 transition-transform hover:-translate-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Consistência</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className={`h-2 flex-1 rounded-full ${i <= (weeklyGoalPercent/20) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Progress Card */}
        <div className="lg:col-span-4 bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent pointer-events-none" />
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-10">Cobertura do Edital</h3>
          <div className="w-full h-56 relative transform group-hover:scale-110 transition-transform duration-700">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'C', value: completedTopics || 0.001 }, { name: 'P', value: Math.max(0.001, totalTopics - completedTopics) }]} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={10} dataKey="value" stroke="none">
                    <Cell fill="#6366f1" />
                    <Cell fill="#1e293b" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', background: '#0f172a', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-8">
            <p className="text-6xl font-black text-white tracking-tighter leading-none">{progressPercent}%</p>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-4">Total Concluído</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Mock Exam Chart */}
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl relative group">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Evolução Competitiva</h3>
            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <TrendingUp size={14} /> Histórico Recente
            </div>
          </div>
          <div className="w-full h-80">
            {isMounted && mockData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme.text, fontSize: 10, fontWeight: '900' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.text, fontSize: 10, fontWeight: '900' }} unit="%" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                    itemStyle={{ fontWeight: '900', color: '#818cf8' }}
                  />
                  <Area type="monotone" dataKey="acerto" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40 italic">
                <BarChart2 size={64} strokeWidth={1} />
                <p className="font-black uppercase tracking-[0.3em] text-[10px]">Aguardando Sincronização de Dados</p>
              </div>
            )}
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-12">Performance por Matriz</h3>
          <div className="space-y-8 max-h-80 overflow-y-auto pr-6 custom-scrollbar">
            {subjects.map(s => {
              const perc = s.topics.length > 0 ? Math.round((s.topics.filter(t => t.completed).length / s.topics.length) * 100) : 0;
              return (
                <div key={s.id} className="space-y-3 group cursor-default">
                  <div className="flex justify-between items-end">
                    <span className="font-black text-slate-800 dark:text-slate-200 text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{s.name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{perc}%</span>
                  </div>
                  <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden p-0.5 border border-slate-100 dark:border-slate-800">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${perc}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
            {subjects.length === 0 && <p className="text-center text-slate-300 py-20 font-black uppercase text-[10px] tracking-widest">Nenhuma matéria vinculada ao edital</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
