
import React, { useState, useEffect, useMemo } from 'react';
import { Subject, MockExam, StudyCycle, StudySession } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Clock, Target, Zap, ArrowUpRight, BarChart2, 
  Flag, Trophy, ChevronRight, User as UserIcon, Flame, Timer, Calendar, Quote,
  Edit2, Check, Loader2
} from 'lucide-react';

interface DashboardProps {
  subjects: Subject[];
  mocks: MockExam[];
  cycle: StudyCycle | null;
  studyLogs: StudySession[];
  weeklyGoal: number;
  examDate?: string;
  onUpdateGoal: (hours: number) => void;
  onUpdateExamDate: (date: string) => void;
  isDarkMode: boolean;
}

const MOTIVATIONAL_PHRASES = [
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Você não precisa ser ótimo para começar, mas precisa começar para ser ótimo.", author: "Zig Ziglar" },
  { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon" },
  { text: "Não pare quando estiver cansado. Pare quando tiver terminado.", author: "Desconhecido" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "Grandes batalhas só são dadas a grandes guerreiros.", author: "Mahatma Gandhi" },
  { text: "Estudar é o caminho para a liberdade.", author: "Epicteto" },
  { text: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", author: "Eleanor Roosevelt" },
  { text: "A jornada de mil milhas começa com um único passo.", author: "Lao Tzu" }
];

const Dashboard: React.FC<DashboardProps> = ({ subjects, mocks, studyLogs, weeklyGoal, examDate, onUpdateGoal, onUpdateExamDate }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // States para edição local rápida
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [localGoal, setLocalGoal] = useState(weeklyGoal);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [localDate, setLocalDate] = useState(examDate || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    setIsMounted(true); 
    const timer = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLocalGoal(weeklyGoal);
  }, [weeklyGoal]);

  useEffect(() => {
    setLocalDate(examDate || '');
  }, [examDate]);

  const totalMinutes = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.reduce((tAcc, t) => tAcc + (t.studyTimeMinutes || 0), 0), 0), [subjects]);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalTopics = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.length, 0), [subjects]);
  const completedTopics = useMemo(() => subjects.reduce((acc, s) => acc + s.topics.filter(t => t.completed).length, 0), [subjects]);
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const thisWeekHours = useMemo(() => {
    const today = new Date();
    const lastSun = new Date(today);
    lastSun.setDate(today.getDate() - today.getDay());
    lastSun.setHours(0, 0, 0, 0);
    const mins = studyLogs.reduce((acc, log) => new Date(log.date) >= lastSun ? acc + log.minutes : acc, 0);
    return parseFloat((mins / 60).toFixed(1));
  }, [studyLogs]);

  const weeklyGoalPercent = Math.min(100, Math.round((thisWeekHours / weeklyGoal) * 100));
  const mockData = useMemo(() => mocks.map(m => ({ name: m.title.substring(0, 8), acerto: Math.round((m.score / m.totalQuestions) * 100) })).slice(-5).reverse(), [mocks]);

  const dailyPhrase = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return MOTIVATIONAL_PHRASES[dayOfYear % MOTIVATIONAL_PHRASES.length];
  }, [now]);

  const countdown = useMemo(() => {
    if (!examDate) return null;
    // Forçar interpretação local da data para evitar fuso horário
    const [year, month, day] = examDate.split('-').map(Number);
    const target = new Date(year, month - 1, day, 12, 0, 0);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0 && target.toDateString() === now.toDateString()) return { days: 0, isPast: false, isToday: true };
    if (diff <= 0) return { days: 0, isPast: true };
    return { days: Math.floor(diff / (1000 * 60 * 60 * 24)), isPast: false };
  }, [examDate, now]);

  const handleSaveDate = async () => {
    setIsSaving(true);
    await onUpdateExamDate(localDate);
    setIsEditingDate(false);
    setIsSaving(false);
  };

  const handleSaveGoal = async () => {
    setIsSaving(true);
    await onUpdateGoal(localGoal);
    setIsEditingGoal(false);
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div className="grid grid-cols-1 gap-6">
        {/* MANTRA DIÁRIO */}
        <div className="px-10 animate-in slide-in-from-left-4 duration-1000">
           <div className="flex items-center gap-4 text-slate-500 italic mb-2">
              <Quote size={14} className="text-indigo-500/50" />
              <p className="text-[11px] font-medium tracking-wide uppercase leading-relaxed">
                "{dailyPhrase.text}" — <span className="text-indigo-400 font-black tracking-widest">{dailyPhrase.author}</span>
              </p>
           </div>
        </div>

        {/* TRILHA DA NOMEAÇÃO */}
        <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden border-b-4 border-indigo-500/30 shadow-2xl">
          <div className="flex justify-between items-end mb-12">
             <div>
                <h3 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                   <Flame className="text-orange-500 animate-pulse" /> TRILHA DA NOMEAÇÃO
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Status da Jornada: <span className="text-indigo-400">{progressPercent}% do Edital Vertical</span></p>
             </div>
             <div className="text-right">
                <span className="text-4xl font-black text-white text-glow">{progressPercent}%</span>
             </div>
          </div>

          <div className="relative h-20 flex items-center px-4">
             <div className="absolute left-10 right-10 h-1.5 bg-slate-900 rounded-full shadow-inner"></div>
             <div 
               className="absolute left-10 h-1.5 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-[2000ms] ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]"
               style={{ width: `calc(${progressPercent}% - 0px)` }}
             ></div>
             <div className="absolute left-0 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500">
                   <Flag size={14} />
                </div>
             </div>
             <div 
               className="absolute transition-all duration-[2000ms] ease-out z-20 flex flex-col items-center"
               style={{ left: `calc(${progressPercent}% - 20px)`, marginLeft: '20px' }}
             >
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-float border-2 border-indigo-400">
                   <UserIcon className="text-indigo-600" size={20} />
                </div>
             </div>
             <div className="absolute right-0 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${progressPercent === 100 ? 'bg-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-110' : 'bg-slate-900 text-slate-700 border border-white/5 opacity-50'}`}>
                   <Trophy size={20} />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* GRID DE CARDS UNIFICADOS COM EDIÇÃO DIRETA */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        
        {/* CARD DATA DA PROVA - EDITÁVEL */}
        <div className={`glass-card p-8 rounded-[2rem] border-l-4 transition-all group overflow-hidden relative ${countdown?.days && countdown.days < 7 ? 'border-rose-500/40 animate-pulse' : 'border-indigo-500/20'}`}>
             <div className="flex items-center justify-between mb-6 relative z-10">
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded bg-white/5 ${countdown?.days && countdown.days < 7 ? 'text-rose-500' : 'text-indigo-400'}`}><Timer size={16}/></div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Dias p/ Prova</span>
               </div>
               <button onClick={() => isEditingDate ? handleSaveDate() : setIsEditingDate(true)} className="p-1.5 text-slate-700 hover:text-white transition-colors bg-white/5 rounded-lg">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : isEditingDate ? <Check size={12} className="text-emerald-500" /> : <Edit2 size={12}/>}
               </button>
             </div>
             
             {isEditingDate ? (
               <input 
                 type="date" 
                 autoFocus
                 className="w-full bg-black/40 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-black text-xs outline-none"
                 value={localDate}
                 onChange={(e) => setLocalDate(e.target.value)}
                 onBlur={handleSaveDate}
                 onKeyDown={(e) => e.key === 'Enter' && handleSaveDate()}
               />
             ) : (
               <p className={`text-3xl font-black tracking-tighter relative z-10 ${countdown?.isToday ? 'text-emerald-500' : countdown?.isPast ? 'text-rose-500' : countdown?.days && countdown.days < 7 ? 'text-rose-500' : 'text-white'}`}>
                 {countdown ? (countdown.isToday ? 'HOJE' : countdown.isPast ? 'PASSOU' : `${countdown.days}d`) : '--'}
               </p>
             )}
             
             {countdown?.days && countdown.days < 7 && !countdown.isPast && (
               <div className="absolute inset-0 bg-rose-500/5 pointer-events-none"></div>
             )}
        </div>

        {/* CARD TEMPO BRUTO */}
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-indigo-500/20 hover:border-l-white transition-all group overflow-hidden relative">
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="p-2 rounded bg-white/5 text-indigo-400"><Clock size={16}/></div>
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Tempo Bruto</span>
             </div>
             <p className="text-3xl font-black tracking-tighter text-white">{totalHours}h {totalMinutes % 60}m</p>
        </div>

        {/* CARD RITMO SEMANAL */}
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-amber-500/20 hover:border-l-white transition-all group overflow-hidden relative">
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="p-2 rounded bg-white/5 text-amber-400"><Zap size={16}/></div>
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Ritmo Semanal</span>
             </div>
             <p className="text-3xl font-black tracking-tighter text-white">{thisWeekHours}h</p>
        </div>

        {/* CARD MÉDIA SIMULADOS */}
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-emerald-500/20 hover:border-l-white transition-all group overflow-hidden relative">
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="p-2 rounded bg-white/5 text-emerald-400"><Target size={16}/></div>
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Média Simulados</span>
             </div>
             <p className="text-3xl font-black tracking-tighter text-white">
               {mocks.length > 0 ? `${Math.round(mocks.reduce((acc, m) => acc + (m.score / m.totalQuestions), 0) / mocks.length * 100)}%` : '0%'}
             </p>
        </div>

        {/* CARD META BATIDA - EDITÁVEL */}
        <div className="glass-card p-8 rounded-[2rem] border-l-4 border-sky-500/20 hover:border-l-white transition-all group overflow-hidden relative">
             <div className="flex items-center justify-between mb-6 relative z-10">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-white/5 text-sky-400"><TrendingUp size={16}/></div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Meta: {weeklyGoal}h</span>
               </div>
               <button onClick={() => isEditingGoal ? handleSaveGoal() : setIsEditingGoal(true)} className="p-1.5 text-slate-700 hover:text-white transition-colors bg-white/5 rounded-lg">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : isEditingGoal ? <Check size={12} className="text-emerald-500" /> : <Edit2 size={12}/>}
               </button>
             </div>
             
             {isEditingGoal ? (
               <input 
                 type="number" 
                 autoFocus
                 className="w-full bg-black/40 border border-sky-500/50 rounded-xl px-3 py-2 text-white font-black text-xs outline-none"
                 value={localGoal}
                 onChange={(e) => setLocalGoal(parseInt(e.target.value) || 0)}
                 onBlur={handleSaveGoal}
                 onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
               />
             ) : (
               <p className="text-3xl font-black tracking-tighter text-white">{weeklyGoalPercent}%</p>
             )}
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                  <ArrowUpRight className="text-indigo-400" /> ANÁLISE TÁTICA
               </h3>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Sessões de Performance Analítica</p>
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
                <p className="font-black text-[10px] uppercase tracking-[0.5em]">Aguardando Ingestão de Dados de Simulados</p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
