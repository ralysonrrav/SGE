
import React, { useState } from 'react';
import { Subject, MockExam, StudyCycle, StudySession } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { CheckCircle2, TrendingUp, Clock, BookOpen, BarChart2, Zap, Settings, Target } from 'lucide-react';

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

  // MÉTRICAS
  const totalMinutes = subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + (t.studyTimeMinutes || 0), 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const completedTopics = subjects.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0);
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const qTopics = subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + (t.questionsAttempted || 0), 0), 0);
  const hTopics = subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + (t.questionsCorrect || 0), 0), 0);
  const qMocks = mocks.reduce((acc, m) => acc + m.totalQuestions, 0);
  const hMocks = mocks.reduce((acc, m) => acc + m.score, 0);
  const totalQ = qTopics + qMocks;
  const totalH = hTopics + hMocks;
  const globalHitRate = totalQ > 0 ? Math.round((totalH / totalQ) * 100) : 0;

  const getThisWeekMinutes = () => {
    const now = new Date();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - now.getDay());
    lastSunday.setHours(0, 0, 0, 0);
    return studyLogs.reduce((acc, log) => new Date(log.date) >= lastSunday ? acc + log.minutes : acc, 0);
  };

  const thisWeekHours = parseFloat((getThisWeekMinutes() / 60).toFixed(1));
  const weeklyGoalPercent = Math.min(100, Math.round((thisWeekHours / weeklyGoal) * 100));

  const mockData = mocks.map(m => ({
    name: m.title.length > 10 ? m.title.substring(0, 10) + '...' : m.title,
    acerto: Math.round((m.score / m.totalQuestions) * 100)
  })).slice(-5);

  const subjectProgressData = subjects.map(s => ({
    name: s.name,
    total: s.topics.length,
    concluido: s.topics.filter(t => t.completed).length,
    color: s.color
  }));

  const chartTheme = {
    grid: isDarkMode ? '#1e293b' : '#f1f5f9',
    text: isDarkMode ? '#94a3b8' : '#64748b',
    tooltipBg: isDarkMode ? '#0f172a' : '#ffffff',
    tooltipBorder: isDarkMode ? '#1e293b' : '#f1f5f9',
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Performance Hub</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Bem-vindo ao comando central dos seus estudos.</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Zap size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Total Estudado</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">{totalHours} Horas</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card de Meta Semanal - Grande Destaque */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-40 -mt-40 opacity-40 group-hover:opacity-60 transition-opacity" />
          
          <div className="relative flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-56 h-56 shrink-0 flex items-center justify-center">
               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                 <circle cx="96" cy="96" r="82" className="stroke-slate-50 dark:stroke-slate-800 fill-none" strokeWidth="16" />
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
                 <span className="text-5xl font-black text-slate-900 dark:text-slate-100">{weeklyGoalPercent}%</span>
                 <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Semanada</span>
               </div>
            </div>

            <div className="flex-1 space-y-8">
               <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                      <Target className="text-indigo-600 dark:text-indigo-500" /> Meta Semanal
                    </h3>
                    <button 
                      onClick={() => setIsEditingGoal(!isEditingGoal)}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all"
                    >
                      <Settings size={22} />
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                    Você completou <span className="text-indigo-600 dark:text-indigo-400 font-black">{thisWeekHours}h</span> das <span className="text-slate-900 dark:text-slate-100 font-black">{weeklyGoal}h</span> previstas para este ciclo.
                  </p>
               </div>

               {isEditingGoal && (
                 <div className="flex gap-3 animate-in slide-in-from-top-4 duration-300">
                    <input 
                      type="number" 
                      className="flex-1 px-5 py-3 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)}
                    />
                    <button onClick={() => { onUpdateGoal(tempGoal); setIsEditingGoal(false); }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all">Salvar</button>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Status do Ciclo</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{weeklyGoalPercent >= 100 ? 'Meta Superada! 🚀' : 'Em Evolução... 📈'}</p>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Renovação</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">Domingo Próximo</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Progresso do Edital - Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Edital Concluído</h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Concluído', value: completedTopics },
                      { name: 'Pendente', value: Math.max(0, totalTopics - completedTopics) }
                    ]}
                    cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value"
                  >
                    <Cell fill="#4f46e5" />
                    <Cell fill={isDarkMode ? '#1e293b' : '#f8fafc'} />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: chartTheme.tooltipBg, 
                      border: `1px solid ${chartTheme.tooltipBorder}`, 
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8">
              <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{progressPercent}%</p>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Cobertura do Conteúdo</p>
            </div>
        </div>
      </div>

      {/* Grid de Mini Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tópicos Batidos', val: `${completedTopics} / ${totalTopics}`, icon: <CheckCircle2 size={24} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Aproveitamento', val: `${globalHitRate}%`, icon: <TrendingUp size={24} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400', sub: `${totalQ} Questões Totais` },
          { label: 'Disciplinas Ativas', val: subjects.length, icon: <BookOpen size={24} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Data Alvo', val: cycle ? new Date(cycle.examDate).toLocaleDateString('pt-BR') : 'Indefinida', icon: <Clock size={24} />, bg: 'bg-rose-50 dark:bg-rose-900/20', color: 'text-rose-600 dark:text-rose-400' },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-7 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-all">
            <div className={`p-4 ${card.bg} ${card.color} rounded-2xl`}>{card.icon}</div>
            <div>
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{card.val}</h3>
              {card.sub && <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{card.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Histórico de Simulados */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Evolução em Simulados (%)</h3>
          <div className="h-72">
            {mockData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTheme.text, fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTheme.text, fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: `1px solid ${chartTheme.tooltipBorder}`, 
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.text,
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' 
                    }}
                    cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                  />
                  <Bar dataKey="acerto" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-3">
                <BarChart2 size={56} className="opacity-10" />
                <p className="font-bold">Aguardando seu primeiro simulado...</p>
              </div>
            )}
          </div>
        </div>

        {/* Progresso Detalhado */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Domínio por Disciplina</h3>
          <div className="space-y-8">
            {subjectProgressData.length > 0 ? (
              subjectProgressData.map((s) => (
                <div key={s.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="font-black text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-xs font-black text-slate-400">{s.concluido} / {s.total}</span>
                  </div>
                  <div className="h-3.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
                    <div 
                      className="h-full transition-all duration-1000 ease-out rounded-full"
                      style={{ 
                        width: `${s.total > 0 ? (s.concluido / s.total) * 100 : 0}%`,
                        backgroundColor: s.color 
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-400 dark:text-slate-600 font-bold">Cadastre suas matérias para monitorar o domínio.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
