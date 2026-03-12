
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, BookOpen, RefreshCcw, BarChart2, LogOut, Menu,
  BrainCircuit, Users, Settings, Loader2, Lock, ShieldCheck, Calendar, Timer, Clock,
  Layers, Plus, Trash2, X, Database, DownloadCloud
} from 'lucide-react';
import { User, Subject, MockExam, StudyCycle, StudySession, PredefinedEdital, Matrix } from './types';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Disciplinas from './components/Disciplinas';
import Ciclos from './components/Ciclos';
import Revisao from './components/Revisao';
import Simulados from './components/Simulados';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import Profile from './components/Profile';

const PAGE_BACKGROUNDS: Record<string, string> = {
  'inicio': 'https://png.pngtree.com/background/20230519/pngtree-a-black-coffee-mug-sits-atop-stack-of-vintage-books-in-image_2661730.jpg', 
  'disciplinas': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070', 
  'revisao': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=2070', 
  'ciclos': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070', 
  'simulados': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=2070', 
  'admin_users': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070',
  'admin_editais': 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070'
};

const KronosIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`kronos-icon-glow ${className}`}
  >
    <defs>
      <linearGradient id="kronos-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <path 
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
      stroke="url(#kronos-grad)" 
      strokeWidth="1.5"
    />
    <path d="M12 1L12 3" stroke="url(#kronos-grad)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 4L19 3" stroke="url(#kronos-grad)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 4L5 3" stroke="url(#kronos-grad)" strokeWidth="2" strokeLinecap="round"/>
    <rect x="7" y="10" width="10" height="5" rx="1" stroke="url(#kronos-grad)" strokeWidth="1" strokeDasharray="2 1"/>
    <circle cx="12" cy="12.5" r="0.5" fill="url(#kronos-grad)" />
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('inicio');
  const [subjects, setSubjects] = useState<Subject[] | null>(null); 
  const [mocks, setMocks] = useState<MockExam[]>([]);
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [bottomStudyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editais, setEditais] = useState<PredefinedEdital[]>([]);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [activeMatrixId, setActiveMatrixId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateMatrixOpen, setIsCreateMatrixOpen] = useState(false);
  const [newMatrixName, setNewMatrixName] = useState('');
  const [isCreatingMatrix, setIsCreatingMatrix] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const loggingOutRef = useRef(false);

  // Relógio Digital em Tempo Real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (userId: string, role: string, matrixId?: string | null) => {
    if (!supabase || loggingOutRef.current) return;
    
    try {
      // Garantir que os estados sejam limpos antes de novas buscas para evitar vazamento entre sessões
      setCycle(null); 
      setSubjects(null);
      setMocks([]);
      setStudyLogs([]);

      // 1. Buscar Matrizes primeiro
      let currentMatrixId = matrixId;
      const { data: matrixData, error: mError } = await supabase.from('matrices').select('*').eq('user_id', userId);
      
      if (mError) {
        console.error("[Matrix] Erro ao buscar matrizes:", mError);
      }

      let finalMatrices = matrixData || [];
      
      // Se não houver matrizes, criar a primeira automaticamente
      if (finalMatrices.length === 0) {
        console.log("[Matrix] Criando matriz inicial...");
        const { data: newMatrix } = await supabase.from('matrices').insert({
          user_id: userId,
          name: 'Matriz Principal',
          is_active: true
        }).select().single();
        
        if (newMatrix) {
          finalMatrices = [newMatrix];
          currentMatrixId = newMatrix.id;
        }
      }

      setMatrices(finalMatrices);
      
      if (!currentMatrixId && finalMatrices.length > 0) {
        const active = finalMatrices.find(m => m.is_active) || finalMatrices[0];
        currentMatrixId = active.id;
      }
      
      setActiveMatrixId(currentMatrixId);

      // 2. Definir Filtro de Busca
      // Se tivermos uma matriz, buscamos dados dela OU dados que ainda não tem matriz (NULL)
      // Isso garante que dados antigos apareçam até serem migrados
      const { data: subRes } = await supabase.from('subjects').select('*').eq('user_id', userId);
      const { data: logRes } = await supabase.from('study_logs').select('*').eq('user_id', userId).order('date', { ascending: false });
      const { data: mockRes } = await supabase.from('mocks').select('*').eq('user_id', userId).order('date', { ascending: false });
      const { data: cycleRes } = await supabase.from('study_cycles').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      const { data: editalRes } = await supabase.from('predefined_editais').select('*');
      const { data: profileRes } = await supabase.from('profiles').select('*').eq('id', userId).single();

      // Filtragem no Lado do Cliente para garantir que dados NULL apareçam na matriz ativa
      const filterByMatrix = (items: any[]) => {
        if (!currentMatrixId) return items;
        return items.filter(item => !item.matrix_id || item.matrix_id === currentMatrixId);
      };

      if (subRes) {
        const filteredSubs = filterByMatrix(subRes);
        setSubjects(filteredSubs.map(s => ({
          ...s,
          id: String(s.id),
          topics: typeof s.topics === 'string' ? JSON.parse(s.topics) : (s.topics || [])
        })));
      }

      if (logRes) {
        const filteredLogs = filterByMatrix(logRes);
        setStudyLogs(filteredLogs.map(l => ({ 
          ...l, 
          id: String(l.id), 
          topicId: l.topic_id, 
          subjectId: String(l.subject_id) 
        })));
      }

      if (mockRes) {
        const filteredMocks = filterByMatrix(mockRes);
        setMocks(filteredMocks.map(m => ({ ...m, id: String(m.id), totalQuestions: m.total_questions, subjectPerformance: m.subject_performance || {} })));
      }
      
      if (cycleRes?.[0]) {
        const filteredCycles = filterByMatrix(cycleRes);
        if (filteredCycles.length > 0) {
          setCycle({ ...filteredCycles[0], id: String(filteredCycles[0].id) });
        } else {
          setCycle(null);
        }
      } else {
        setCycle(null);
      }

      if (editalRes) {
        setEditais(editalRes.map(e => {
          const rawSubjects = typeof e.subjects === 'string' ? JSON.parse(e.subjects) : (e.subjects || []);
          const parsedSubjects = rawSubjects.map((s: any) => ({
            ...s,
            topics: typeof s.topics === 'string' ? JSON.parse(s.topics) : (s.topics || [])
          }));
          
          return { 
            ...e, 
            id: String(e.id), 
            examDate: e.exam_date, 
            lastUpdated: e.last_updated,
            subjects: parsedSubjects
          };
        }));
      }

      if (profileRes) {
        const activeMatrix = finalMatrices.find(m => m.id === currentMatrixId);
        setUser(prev => prev ? { 
          ...prev, 
          examDate: activeMatrix?.exam_date || profileRes.exam_date, 
          weeklyGoal: activeMatrix?.weekly_goal || profileRes.weekly_goal || 20,
          activeMatrixId: profileRes.active_matrix_id
        } : null);

        if (!currentMatrixId && profileRes.active_matrix_id) {
          setActiveMatrixId(profileRes.active_matrix_id);
          // Recarregar com a matriz correta se necessário
          fetchData(userId, role, profileRes.active_matrix_id);
          return;
        }
      }

      if (role === 'administrator') {
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) setAllUsers(profiles.map(p => ({ ...p, id: String(p.id), name: p.name || 'Usuário', lastAccess: p.last_seen })));
      }
    } catch (e: any) {
      console.error("[Data-Sync] Falha no isolamento:", e);
      setSubjects([]);
      setCycle(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!supabase) { setIsLoaded(true); return; }
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const role = (profile?.role === 'admin' || profile?.role === 'administrator' || session.user.email === 'ralysonriccelli@gmail.com') ? 'administrator' : 'student';
        
        const u: User = {
          id: session.user.id,
          name: profile?.name || session.user.user_metadata?.full_name || 'Usuário',
          email: session.user.email || '',
          role: role as any,
          status: 'active',
          isOnline: true,
          examDate: profile?.exam_date,
          weeklyGoal: profile?.weekly_goal || 20
        };
        setUser(u);
        fetchData(u.id, u.role);
      }
      setIsLoaded(true);
    };
    init();
  }, [fetchData]);

  const handleUpdateExamDate = async (date: string) => {
    if (!user || !supabase) return;
    
    setUser(prev => prev ? { ...prev, examDate: date } : null);
    
    try {
      if (activeMatrixId) {
        await supabase
          .from('matrices')
          .update({ exam_date: date })
          .eq('id', activeMatrixId);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ exam_date: date })
        .eq('id', user.id);
        
      if (error) throw error;
      console.log("[CORE] Data da prova persistida no banco:", date);
    } catch (e) {
      console.error("[CORE] Erro fatal ao persistir data da prova:", e);
      fetchData(user.id, user.role, activeMatrixId);
    }
  };

  const handleUpdateGoal = async (hours: number) => {
    if (user && supabase) {
      setUser(prev => prev ? { ...prev, weeklyGoal: hours } : null);
      try {
        if (activeMatrixId) {
          await supabase
            .from('matrices')
            .update({ weekly_goal: hours })
            .eq('id', activeMatrixId);
        }
        const { error } = await supabase.from('profiles').update({ weekly_goal: hours }).eq('id', user.id);
        if (error) throw error;
        console.log("[CORE] Meta semanal sincronizada:", hours);
      } catch (e) {
        console.error("[CORE] Falha ao salvar meta semanal:", e);
      }
    }
  };

  const handleSwitchMatrix = async (matrixId: string) => {
    if (!user || !supabase) return;
    setActiveMatrixId(matrixId);
    try {
      await supabase.from('profiles').update({ active_matrix_id: matrixId }).eq('id', user.id);
      await supabase.from('matrices').update({ is_active: false }).eq('user_id', user.id);
      await supabase.from('matrices').update({ is_active: true }).eq('id', matrixId);
      fetchData(user.id, user.role, matrixId);
    } catch (e) {
      console.error("[Matrix] Erro ao trocar matriz:", e);
    }
  };

  const handleCreateMatrix = async (name: string) => {
    if (!user || !supabase || !name.trim()) return;
    setIsCreatingMatrix(true);
    try {
      const { data, error } = await supabase.from('matrices').insert({
        user_id: user.id,
        name: name.trim(),
        is_active: true
      }).select().single();

      if (error) throw error;
      if (data) {
        await supabase.from('matrices').update({ is_active: false }).eq('user_id', user.id).neq('id', data.id);
        await supabase.from('profiles').update({ active_matrix_id: data.id }).eq('id', user.id);
        setIsCreateMatrixOpen(false);
        setNewMatrixName('');
        fetchData(user.id, user.role, data.id);
      }
    } catch (e) {
      console.error("[Matrix] Erro ao criar matriz:", e);
      alert("Erro ao criar ambiente. Verifique a conexão.");
    } finally {
      setIsCreatingMatrix(false);
    }
  };

  const handleCreateFromTemplate = async (edital: PredefinedEdital) => {
    if (!user || !supabase) return;
    setIsCreatingMatrix(true);
    try {
      console.log("[Matrix] Criando a partir do modelo:", edital.name);
      
      // 1. Criar a Matriz
      const { data: matrix, error: mErr } = await supabase.from('matrices').insert({
        user_id: user.id,
        name: edital.name,
        exam_date: edital.examDate,
        is_active: true
      }).select().single();

      if (mErr) {
        console.error("[Matrix] Erro ao criar matriz:", mErr);
        throw mErr;
      }

      if (matrix) {
        // 2. Desativar outras matrizes e atualizar perfil
        await Promise.all([
          supabase.from('matrices').update({ is_active: false }).eq('user_id', user.id).neq('id', matrix.id),
          supabase.from('profiles').update({ active_matrix_id: matrix.id }).eq('id', user.id)
        ]);

        // 3. Clonar as disciplinas do edital para a nova matriz
        const subjects = edital.subjects || [];
        if (subjects.length > 0) {
          const subjectsToInsert = subjects.map(sub => ({
            user_id: user.id,
            matrix_id: matrix.id,
            name: sub.name,
            color: sub.color,
            topics: (sub.topics || []).map(t => ({
              id: `topic-${Math.random().toString(36).substr(2, 9)}`,
              title: t.title,
              importance: t.importance || 3,
              completed: false,
              studyTimeMinutes: 0,
              questionsAttempted: 0,
              questionsCorrect: 0
            }))
          }));

          const { error: sErr } = await supabase.from('subjects').insert(subjectsToInsert);
          if (sErr) {
            console.error("[Matrix] Erro ao inserir disciplinas:", sErr);
            throw sErr;
          }
        }

        setIsCreateMatrixOpen(false);
        await fetchData(user.id, user.role, matrix.id);
        console.log("[Matrix] Ambiente criado e dados carregados com sucesso.");
      }
    } catch (e: any) {
      console.error("[Matrix] Erro fatal ao criar do modelo:", e);
      alert(`Erro ao importar modelo: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setIsCreatingMatrix(false);
    }
  };

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSubjects(null);
    setCycle(null); // Limpeza de segurança no logout
    setMocks([]);
    setStudyLogs([]);
    setIsLoggingOut(false);
    loggingOutRef.current = false;
  };

  const handleAddLogLocally = (log: StudySession) => {
    setStudyLogs(prev => [log, ...prev]);
  };

  if (!isLoaded || isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 mb-6" size={56} />
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.6em] animate-pulse">Protegendo Ambiente</span>
      </div>
    );
  }

  if (!user) return <Login users={allUsers} onLogin={(u) => { setUser(u); fetchData(u.id, u.role); }} onRegister={(u) => { setUser(u); fetchData(u.id, u.role); }} />;

  const currentDateFormatted = currentTime.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const currentTimeFormatted = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-main-overlay opacity-20" style={{ backgroundImage: `url('${PAGE_BACKGROUNDS[currentPage] || PAGE_BACKGROUNDS['inicio']}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent"></div>
        <div className="scanline"></div>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel transform transition-all duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentPage('inicio')}>
            <div className="p-2 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-all">
              <KronosIcon size={24} />
            </div>
            <h1 className="text-xl font-black text-white tracking-widest kronos-gradient">KRONOS</h1>
          </div>

          {/* Workspace Switcher - Redesenhado */}
          <div className="px-4 mb-8">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ambiente Ativo</span>
                </div>
                <button 
                  onClick={() => setIsCreateMatrixOpen(true)}
                  className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-all hover:scale-110 border border-white/5"
                  title="Novo Ambiente"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {matrices.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => handleSwitchMatrix(m.id)}
                    className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                      activeMatrixId === m.id 
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers size={12} className={activeMatrixId === m.id ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"} />
                      <span className="truncate">{m.name}</span>
                    </div>
                    {activeMatrixId === m.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {[
              { id: 'inicio', label: 'HUB', icon: <LayoutDashboard size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'disciplinas', label: 'QUESTS', icon: <BookOpen size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'revisao', label: 'SYNC', icon: <RefreshCcw size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'ciclos', label: 'PLAN', icon: <Timer size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'simulados', label: 'LOGS', icon: <BarChart2 size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'admin_users', label: 'GOV', icon: <Users size={16} />, roles: ['administrator'] },
              { id: 'admin_editais', label: 'CORE', icon: <Settings size={16} />, roles: ['administrator'] },
            ].filter(i => i.roles.includes(user.role)).map(item => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="p-6 border-t border-white/5">
             <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-all mb-4">
                <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">{user.name.charAt(0)}</div>
                <span className="text-[9px] font-black uppercase text-white truncate">{user.name.split(' ')[0]}</span>
             </button>
             <button onClick={handleLogout} className="w-full text-rose-500/60 font-black text-[9px] uppercase tracking-widest hover:text-rose-500 transition-colors">EXIT</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10">
        <header className="h-16 flex items-center justify-between px-10 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-indigo-400" onClick={() => setIsSidebarOpen(true)}><Menu size={20}/></button>
              <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">TERMINAL / <span className="text-white">{currentPage}</span></h2>
           </div>
           
           <div className="flex items-center gap-4">
             {/* Airport Style Digital Clock */}
             <div className="hidden md:flex items-center gap-3 px-4 py-1 bg-black/60 rounded-lg border border-white/10 shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]">
                <Clock size={12} className="text-cyan-400/70" />
                <span className="text-[12px] font-black text-cyan-400 tabular-nums tracking-widest font-mono">
                  {currentTimeFormatted}
                </span>
             </div>

             <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-lg border border-white/5">
                <Calendar size={12} className="text-indigo-400" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{currentDateFormatted}</span>
             </div>
             
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-white/5 shadow-inner">
               <Lock size={12} className="text-indigo-500" />
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Acesso Privado Ativo</span>
             </div>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
          <div className="max-w-7xl mx-auto">
            {currentPage === 'inicio' && <Dashboard subjects={subjects || []} mocks={mocks} cycle={cycle} studyLogs={bottomStudyLogs} weeklyGoal={user.weeklyGoal || 20} examDate={user.examDate} onUpdateGoal={handleUpdateGoal} onUpdateExamDate={handleUpdateExamDate} isDarkMode={true} />}
            {currentPage === 'disciplinas' && <Disciplinas user={user} subjects={subjects || []} setSubjects={setSubjects as any} predefinedEditais={editais} onAddLog={handleAddLogLocally} onUpdateExamDate={handleUpdateExamDate} activeMatrixId={activeMatrixId} />}
            {currentPage === 'revisao' && <Revisao user={user} subjects={subjects || []} setSubjects={setSubjects as any} onAddLog={handleAddLogLocally} activeMatrixId={activeMatrixId} />}
            {currentPage === 'ciclos' && <Ciclos user={user} subjects={subjects || []} cycle={cycle} setCycle={setCycle} activeMatrixId={activeMatrixId} />}
            {currentPage === 'simulados' && <Simulados user={user} mocks={mocks} setMocks={setMocks} subjects={subjects || []} activeMatrixId={activeMatrixId} />}
            {currentPage === 'admin_users' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="users" editais={editais} setEditais={setEditais} />}
            {currentPage === 'admin_editais' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="editais" editais={editais} setEditais={setEditais} />}
          </div>
        </div>
      </main>

      {isProfileOpen && <Profile user={user} onUpdate={()=>{}} onDelete={handleLogout} onClose={() => setIsProfileOpen(false)} onExport={()=>{}} onImport={()=>{}} />}

      {/* Modal de Gestão de Ambientes (Hub) */}
      {isCreateMatrixOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in">
          <div className="glass-card w-full max-w-4xl rounded-[3rem] p-10 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                  <Layers size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão de Ambientes</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecione, crie ou importe seu foco de estudo</p>
                </div>
              </div>
              <button onClick={() => setIsCreateMatrixOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Coluna Esquerda: Criação e Meus Ambientes */}
              <div className="space-y-10">
                <section>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 ml-1">Criar Personalizado</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="NOME DO CONCURSO..."
                      className="flex-1 px-6 py-4 rounded-2xl border border-white/10 bg-black/40 text-white font-black text-xs uppercase outline-none focus:border-indigo-500 transition-all"
                      value={newMatrixName}
                      onChange={(e) => setNewMatrixName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateMatrix(newMatrixName)}
                    />
                    <button 
                      disabled={isCreatingMatrix || !newMatrixName.trim()}
                      onClick={() => handleCreateMatrix(newMatrixName)}
                      className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50"
                    >
                      {isCreatingMatrix ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 ml-1">Meus Ambientes Ativos</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {matrices.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => { handleSwitchMatrix(m.id); setIsCreateMatrixOpen(false); }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          activeMatrixId === m.id 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
                            : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Layers size={14} className={activeMatrixId === m.id ? "text-indigo-400" : "text-slate-600"} />
                          <span className="text-[11px] font-black uppercase tracking-tight">{m.name}</span>
                        </div>
                        {activeMatrixId === m.id && <ShieldCheck size={14} className="text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              {/* Coluna Direita: Modelos (Matrizes Cadastradas) */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4 ml-1">Modelos Disponíveis (Matrizes)</h4>
                <div className="grid grid-cols-1 gap-3">
                  {editais.map(edital => (
                    <div key={edital.id} className="group bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-amber-500/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-black text-white text-sm uppercase tracking-tight">{edital.name}</h5>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{edital.organization}</p>
                        </div>
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                          <Database size={14} />
                        </div>
                      </div>
                      <button 
                        disabled={isCreatingMatrix}
                        onClick={() => handleCreateFromTemplate(edital)}
                        className="w-full py-3 bg-white/5 border border-white/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                      >
                        {isCreatingMatrix ? <Loader2 size={12} className="animate-spin" /> : <DownloadCloud size={12} />}
                        Usar este Modelo
                      </button>
                    </div>
                  ))}
                  {editais.length === 0 && (
                    <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhum modelo cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
