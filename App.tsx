
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
  const [bottomStudyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editais, setEditais] = useState<PredefinedEdital[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const loggingOutRef = useRef(false);

  // Heartbeat: Atualiza status online
  useEffect(() => {
    if (!user || user.role === 'visitor' || !supabase) return;
    const updatePresence = async () => {
      try { await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id); } catch (e) {}
    };
    updatePresence();
    const interval = setInterval(updatePresence, 120000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = useCallback(async (userId: string, role: string) => {
    if (!supabase || loggingOutRef.current) return;
    try {
      const [subRes, mockRes, logRes, cycleRes, editalRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('mocks').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('study_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('study_cycles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('predefined_editais').select('*')
      ]);

      if (subRes.data) setSubjects(subRes.data.map(s => ({ ...s, id: String(s.id), topics: s.topics || [] })));
      if (mockRes.data) setMocks(mockRes.data.map(m => ({ ...m, id: String(m.id), totalQuestions: m.total_questions, subjectPerformance: m.subject_performance })));
      if (logRes.data) setStudyLogs(logRes.data.map(l => ({ ...l, id: String(l.id), topicId: l.topic_id, subjectId: l.subject_id })));
      if (cycleRes.data?.[0]) setCycle({ ...cycleRes.data[0], id: String(cycleRes.data[0].id) });
      if (editalRes.data) setEditais(editalRes.data.map(e => ({ ...e, examDate: e.exam_date, lastUpdated: e.last_updated })));

      if (role === 'administrator') {
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) setAllUsers(profiles.map(p => ({ ...p, name: p.name || 'Usuário', lastAccess: p.last_seen })));
      }
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
        } else {
          const u: User = {
            id: session.user.id,
            name: profile?.name || 'Usuário',
            email: session.user.email!,
            role: profile?.role || 'student',
            status: profile?.status || 'active',
            isOnline: true,
            weeklyGoal: profile?.weekly_goal || 20
          };
          setUser(u);
          fetchData(u.id, u.role);
        }
      }
      setIsLoaded(true);
    };
    init();
  }, [fetchData]);

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSubjects([]);
    setMocks([]);
    setCycle(null);
    setStudyLogs([]);
    setIsLoggingOut(false);
    loggingOutRef.current = false;
  };

  const addLog = useCallback(async (minutes: number, topicId: string, subjectId: string, date: string) => {
    if (!user || user.role === 'visitor' || !supabase) return;
    const newLog = { minutes, topic_id: topicId, subject_id: subjectId, date, user_id: user.id, type: 'estudo' };
    try {
      const { data } = await supabase.from('study_logs').insert([newLog]).select().single();
      if (data) setStudyLogs(prev => [{ ...data, id: String(data.id), topicId: data.topic_id, subjectId: data.subject_id }, ...prev]);
    } catch (e) {}
  }, [user]);

  if (!isLoaded || isLoggingOut) {
    return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
      <p className="font-black text-[10px] tracking-widest uppercase">Carregando Ecossistema</p>
    </div>;
  }

  if (!user) return <Login users={allUsers} onLogin={(u) => { setUser(u); fetchData(u.id, u.role); }} onRegister={(u) => { setUser(u); fetchData(u.id, u.role); }} />;

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-8">
          <div className="mb-10">
            <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">StudyFlow</h1>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Controle de Performance</p>
          </div>
          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            {[
              { id: 'inicio', label: 'Início', icon: <Home size={20} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'disciplinas', label: 'Disciplinas', icon: <BookOpen size={20} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'revisao', label: 'Revisões', icon: <RefreshCcw size={20} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'ciclos', label: 'Ciclos', icon: <BrainCircuit size={20} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={20} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'admin_users', label: 'Usuários', icon: <Users size={20} />, roles: ['administrator'] },
              { id: 'admin_editais', label: 'Matrizes', icon: <Settings size={20} />, roles: ['administrator'] },
            ].filter(i => i.roles.includes(user.role)).map(item => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none translate-x-1' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="pt-6 border-t dark:border-slate-800 space-y-4">
             <div className="flex gap-2">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-center text-slate-500">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button onClick={() => setIsProfileOpen(true)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-center text-slate-500"><UserIcon size={18}/></button>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 text-rose-500 font-black text-[10px] uppercase p-4 hover:bg-rose-50 rounded-xl transition-all">
               <LogOut size={16} /> Sair
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-80 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto p-8 md:p-16">
          {currentPage === 'inicio' && <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={bottomStudyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />}
          {currentPage === 'disciplinas' && <Disciplinas user={user} subjects={subjects} setSubjects={setSubjects} predefinedEditais={editais} onAddLog={addLog} />}
          {currentPage === 'revisao' && <Revisao user={user} subjects={subjects} setSubjects={setSubjects} onAddLog={addLog} />}
          {currentPage === 'ciclos' && <Ciclos user={user} subjects={subjects} cycle={cycle} setCycle={setCycle} />}
          {currentPage === 'simulados' && <Simulados user={user} mocks={mocks} setMocks={setMocks} subjects={subjects} />}
          {currentPage === 'admin_users' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="users" editais={editais} setEditais={setEditais} />}
          {currentPage === 'admin_editais' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="editais" editais={editais} setEditais={setEditais} />}
        </div>
      </main>

      {isProfileOpen && <Profile user={user} onUpdate={(u) => { setUser(u); }} onDelete={handleLogout} onClose={() => setIsProfileOpen(false)} onExport={()=>{}} onImport={()=>{}} />}
      
      <button className="md:hidden fixed bottom-8 right-8 z-[60] p-5 bg-indigo-600 text-white rounded-full shadow-2xl" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  );
};

export default App;
