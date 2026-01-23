
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Home, BookOpen, RefreshCcw, Calendar, BarChart2, LogOut, Menu, X,
  BrainCircuit, Award, Sun, Moon, Users, Database, Loader2, ShieldCheck, 
  Eye, Settings, WifiOff, CloudSync, User as UserIcon, Sparkles
} from 'lucide-react';
import { User, Subject, MockExam, StudyCycle, StudySession, PredefinedEdital } from './types';
import { supabase, isNetworkError } from './lib/supabase';
import Login from './components/Login';
import Disciplinas from './components/Disciplinas';
import Ciclos from './components/Ciclos';
import Revisao from './components/Revisao';
import Simulados from './components/Simulados';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('inicio');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mocks, setMocks] = useState<MockExam[]>([]);
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const loggingOutRef = useRef(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [editais, setEditais] = useState<PredefinedEdital[]>([
    {
      id: 'edital-pf-agente',
      name: 'Agente da Polícia Federal',
      organization: 'PF / Cebraspe',
      lastUpdated: new Date().toISOString(),
      subjects: [
        { id: 'pf-1', name: 'Português', color: '#6366f1', topics: [{ id: 't1', title: 'Compreensão de textos', completed: false, importance: 5, studyTimeMinutes: 0 }] },
        { id: 'pf-2', name: 'Informática', color: '#10b981', topics: [{ id: 't3', title: 'Segurança da Informação', completed: false, importance: 5, studyTimeMinutes: 0 }] }
      ]
    }
  ]);

  const saveToLocal = useCallback((key: string, data: any) => {
    localStorage.setItem(`sf_cache_${key}`, JSON.stringify(data));
  }, []);

  const loadFromLocal = useCallback((key: string) => {
    const data = localStorage.getItem(`sf_cache_${key}`);
    return data ? JSON.parse(data) : null;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    const cachedSubjects = loadFromLocal('subjects');
    const cachedMocks = loadFromLocal('mocks');
    const cachedLogs = loadFromLocal('logs');

    if (cachedSubjects) setSubjects(cachedSubjects);
    if (cachedMocks) setMocks(cachedMocks);
    if (cachedLogs) setStudyLogs(cachedLogs);

    if (!supabase || loggingOutRef.current) return;

    setIsSyncing(true);
    try {
      const [subRes, mockRes, logRes] = await Promise.all([
        supabase.from('subjects').select('*').order('created_at', { ascending: true }),
        supabase.from('mocks').select('*').order('date', { ascending: false }),
        supabase.from('study_logs').select('*').order('date', { ascending: false })
      ]);

      if (subRes.data) {
        const mapped = subRes.data.map((s, i) => ({
          ...s, id: String(s.id), topics: s.topics || [],
          color: s.color || ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5]
        }));
        setSubjects(mapped);
        saveToLocal('subjects', mapped);
      }

      if (mockRes.data) {
        const mapped = mockRes.data.map(m => ({ ...m, id: String(m.id) }));
        setMocks(mapped);
        saveToLocal('mocks', mapped);
      }

      if (logRes.data) {
        const mapped = logRes.data.map(l => ({ ...l, id: String(l.id) }));
        setStudyLogs(mapped);
        saveToLocal('logs', mapped);
      }
      setIsOffline(false);
    } catch (e: any) {
      if (isNetworkError(e)) setIsOffline(true);
    } finally {
      setIsSyncing(false);
    }
  }, [loadFromLocal, saveToLocal]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!supabase) { setIsLoaded(true); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          
          const newUser: User = {
            id: session.user.id,
            name: profile?.full_name || session.user.user_metadata?.full_name || 'Usuário',
            email: session.user.email!,
            role: profile?.role || (session.user.email === 'ralysonriccelli@gmail.com' ? 'administrator' : 'student'),
            status: profile?.status || 'active',
            isOnline: true,
            weeklyGoal: profile?.weekly_goal || 20
          };
          
          if (newUser.status === 'blocked') {
            await supabase.auth.signOut();
            alert("Sua conta está bloqueada. Entre em contato com o suporte.");
            return;
          }

          setUser(newUser);
          fetchUserData(session.user.id);
          
          if (newUser.role === 'administrator') {
            const { data: profiles } = await supabase.from('profiles').select('*');
            if (profiles) setAllUsers(profiles);
          }
        }
      } catch (e) {
        console.warn("Offline initialization active.");
      } finally { if (isMounted) setIsLoaded(true); }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchUserData]);

  const addStudyLog = useCallback(async (minutes: number, topicId: string, subjectId: string, date: string) => {
    const newEntry: StudySession = { 
      id: `local-${Date.now()}`, 
      minutes, 
      topicId, 
      subjectId, 
      date: date, // Usando a data passada pelo modal
      type: 'estudo' 
    };

    setStudyLogs(prev => {
      const up = [newEntry, ...prev];
      saveToLocal('logs', up);
      return up;
    });

    if (user?.role === 'visitor' || !supabase) return;

    try {
      await supabase.from('study_logs').insert([{
        minutes, 
        topic_id: topicId, 
        subject_id: subjectId, 
        date: date, 
        type: 'estudo'
      }]);
    } catch (e) {
      if (isNetworkError(e)) setIsOffline(true);
    }
  }, [user, saveToLocal]);

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    localStorage.clear();
    setUser(null);
    setIsLoggingOut(false);
    loggingOutRef.current = false;
  };

  const navItems = useMemo(() => [
    { id: 'inicio', label: 'Dashboard', icon: <Home size={20} />, roles: ['administrator', 'student', 'visitor'] },
    { id: 'disciplinas', label: 'Edital Vertical', icon: <BookOpen size={20} />, roles: ['administrator', 'student', 'visitor'] },
    { id: 'ciclos', label: 'Mentoria IA', icon: <BrainCircuit size={20} />, roles: ['administrator', 'student', 'visitor'] },
    { id: 'revisao', label: 'Revisões', icon: <RefreshCcw size={20} />, roles: ['administrator', 'student', 'visitor'] },
    { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={20} />, roles: ['administrator', 'student', 'visitor'] },
    { id: 'admin_users', label: 'Comunidade', icon: <Users size={20} />, roles: ['administrator'] },
    { id: 'admin_editais', label: 'Master Editais', icon: <Settings size={20} />, roles: ['administrator'] },
  ].filter(item => item.roles.includes(user?.role || '')), [user]);

  if (!isLoaded || isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-[2rem] bg-indigo-600/10 flex items-center justify-center animate-pulse">
            <Loader2 className="animate-spin text-indigo-600" size={48} strokeWidth={1.5} />
          </div>
          <Award className="absolute -top-2 -right-2 text-indigo-500" size={24} />
        </div>
        <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Protocolo de Segurança Ativo</p>
      </div>
    );
  }

  if (!user) return <Login users={allUsers} onLogin={(u) => { setUser(u); fetchUserData(u.id); }} onRegister={(u) => { setUser(u); fetchUserData(u.id); }} />;

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        {isOffline && (
          <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.4em] py-1 text-center flex items-center justify-center gap-3 shadow-2xl pointer-events-auto">
            <WifiOff size={10} /> MODO LOCAL: SINCRONIZAÇÃO PAUSADA
          </div>
        )}
        {isSyncing && !isOffline && (
          <div className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.4em] py-1 text-center flex items-center justify-center gap-3 pointer-events-auto">
            <CloudSync size={10} className="animate-bounce" /> ATUALIZANDO ECOSSISTEMA
          </div>
        )}
      </div>

      <button 
        className={`md:hidden fixed z-[60] p-4 bg-indigo-600 text-white rounded-3xl shadow-2xl transition-all active:scale-90 ${isOffline || isSyncing ? 'top-10 left-6' : 'top-6 left-6'}`} 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}>
        <div className="flex flex-col h-full">
          <div className="p-10 pt-16 flex items-center gap-5 group cursor-default">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none transition-transform group-hover:rotate-12">
              <Sparkles size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none">StudyFlow</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 text-indigo-500">Lógica de Aprovação</p>
            </div>
          </div>
          
          <nav className="flex-1 px-6 py-4 space-y-2.5 overflow-y-auto">
            {navItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-[1.25rem] text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 dark:shadow-none translate-x-2' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600'}`}
              >
                <div className={`${currentPage === item.id ? 'text-white' : 'text-indigo-500'}`}>{item.icon}</div> 
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
             <div className="bg-slate-200/50 dark:bg-slate-950 p-1.5 rounded-2xl flex items-center">
                <button onClick={() => setIsDarkMode(false)} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${!isDarkMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}><Sun size={18} /></button>
                <button onClick={() => setIsDarkMode(true)} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md' : 'text-slate-400'}`}><Moon size={18} /></button>
             </div>
             
             <button 
               onClick={() => setIsProfileOpen(true)}
               className="w-full p-4.5 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl group"
             >
               <div className="flex items-center gap-4">
                 <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-slate-950 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 dark:border-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                   {user.name.charAt(0)}
                 </div>
                 <div className="min-w-0">
                   <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-none">{user.name}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate mt-1.5">{user.role}</p>
                 </div>
               </div>
             </button>

             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 text-rose-500 font-black text-[10px] uppercase tracking-widest p-4 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all">
               <LogOut size={16} /> Encerrar Sessão
             </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 md:ml-80 overflow-y-auto bg-white dark:bg-slate-950 transition-all duration-700 ease-in-out ${isOffline || isSyncing ? 'pt-14' : 'pt-0'}`}>
        <div className="max-w-7xl mx-auto p-8 md:p-16">
          {currentPage === 'inicio' && <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />}
          {currentPage === 'disciplinas' && <Disciplinas subjects={subjects} setSubjects={setSubjects} predefinedEditais={editais} onAddLog={addStudyLog} />}
          {currentPage === 'ciclos' && <Ciclos subjects={subjects} setCycle={setCycle} cycle={cycle} />}
          {currentPage === 'revisao' && <Revisao subjects={subjects} setSubjects={setSubjects} onAddLog={addStudyLog} />}
          {currentPage === 'simulados' && <Simulados mocks={mocks} setMocks={setMocks} subjects={subjects} />}
          {currentPage === 'admin_users' && <Admin users={allUsers} setUsers={setAllUsers} editais={editais} setEditais={setEditais} view="users" />}
          {currentPage === 'admin_editais' && <Admin users={allUsers} setUsers={setAllUsers} editais={editais} setEditais={setEditais} view="editais" />}
        </div>
      </main>

      {isProfileOpen && (
        <Profile user={user} onUpdate={(u) => { setUser(u); saveToLocal('user', u); }} onDelete={handleLogout} onClose={() => setIsProfileOpen(false)} onExport={() => {}} onImport={() => {}} />
      )}
    </div>
  );
};

export default App;
