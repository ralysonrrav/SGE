
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Home, BookOpen, RefreshCcw, BarChart2, LogOut, Menu, X,
  BrainCircuit, Sun, Moon, Users, Settings, Loader2, User as UserIcon
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const loggingOutRef = useRef(false);

  // Heartbeat: Atualiza o status online no banco de dados
  useEffect(() => {
    if (!user || user.role === 'visitor' || !supabase) return;
    
    const updatePresence = async () => {
      try {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
      } catch (e) {}
    };

    updatePresence();
    const interval = setInterval(updatePresence, 120000); // A cada 2 min
    return () => clearInterval(interval);
  }, [user]);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!supabase || loggingOutRef.current) return;

    try {
      const [subRes, mockRes, logRes, cycleRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('mocks').select('*').eq('user_id', userId),
        supabase.from('study_logs').select('*').eq('user_id', userId),
        supabase.from('study_cycles').select('*').eq('user_id', userId).limit(1)
      ]);

      if (subRes.data) setSubjects(subRes.data.map(s => ({ ...s, id: String(s.id), topics: s.topics || [] })));
      if (mockRes.data) setMocks(mockRes.data.map(m => ({ ...m, id: String(m.id), totalQuestions: m.total_questions, subjectPerformance: m.subject_performance })));
      if (logRes.data) setStudyLogs(logRes.data.map(l => ({ ...l, id: String(l.id), topicId: l.topic_id, subjectId: l.subject_id })));
      if (cycleRes.data?.[0]) setCycle({ ...cycleRes.data[0], id: String(cycleRes.data[0].id) });
      
      setIsOffline(false);
    } catch (e: any) {
      if (isNetworkError(e)) setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!supabase) { setIsLoaded(true); return; }
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        
        if (profile?.status === 'blocked') {
          await supabase.auth.signOut();
          setUser(null);
          setIsLoaded(true);
          return;
        }

        const newUser: User = {
          id: session.user.id,
          name: profile?.name || 'Usuário',
          email: session.user.email!,
          role: profile?.role || 'student',
          status: profile?.status || 'active',
          isOnline: true
        };

        setUser(newUser);
        fetchUserData(session.user.id);

        if (newUser.role === 'administrator') {
          const { data: profiles } = await supabase.from('profiles').select('*');
          if (profiles) setAllUsers(profiles.map(p => ({ 
            ...p, 
            name: p.name || 'Usuário', 
            lastAccess: p.last_seen 
          })));
        }
      }
      setIsLoaded(true);
    };
    init();
  }, [fetchUserData]);

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setIsLoggingOut(false);
    loggingOutRef.current = false;
  };

  if (!isLoaded || isLoggingOut) {
    return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
      <p className="font-black text-[10px] tracking-widest uppercase">Sincronizando Perfis</p>
    </div>;
  }

  if (!user) return <Login users={allUsers} onLogin={setUser} onRegister={setUser} />;

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-8">
          <div className="mb-12">
            <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">StudyFlow</h1>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Controle de Membros</p>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              { id: 'inicio', label: 'Dashboard', icon: <Home size={20} />, roles: ['administrator', 'student'] },
              { id: 'disciplinas', label: 'Editais', icon: <BookOpen size={20} />, roles: ['administrator', 'student'] },
              { id: 'admin_users', label: 'Membros', icon: <Users size={20} />, roles: ['administrator'] },
              { id: 'admin_editais', label: 'Matrizes', icon: <Settings size={20} />, roles: ['administrator'] },
            ].filter(i => i.roles.includes(user.role)).map(item => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="pt-8 border-t dark:border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 text-rose-500 font-black text-[10px] uppercase p-4 hover:bg-rose-50 rounded-xl transition-all">
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-80 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 md:p-16">
        {currentPage === 'inicio' && <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />}
        {/* Fix: removed 'editais' and 'setEditais' props which were not defined in AdminProps interface */}
        {currentPage === 'admin_users' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="users" />}
        {currentPage === 'disciplinas' && <Disciplinas user={user} subjects={subjects} setSubjects={setSubjects} predefinedEditais={[]} onAddLog={() => {}} />}
        {currentPage === 'revisao' && <Revisao user={user} subjects={subjects} setSubjects={setSubjects} onAddLog={() => {}} />}
      </main>
    </div>
  );
};

export default App;
