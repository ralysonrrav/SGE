
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, BookOpen, RefreshCcw, Calendar, BarChart2, LogOut, Menu, X,
  BrainCircuit, Award, Sun, Moon, Users, Database, Loader2
} from 'lucide-react';
import { User, Subject, MockExam, StudyCycle, StudySession, PredefinedEdital } from './types';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Disciplinas from './components/Disciplinas';
import Ciclos from './components/Ciclos';
import Revisao from './components/Revisao';
import Simulados from './components/Simulados';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';

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
        { id: 'pf-1', name: 'Português', color: '#6366f1', topics: [{ id: 't1', title: 'Compreensão de textos', completed: false, importance: 5 }] },
        { id: 'pf-2', name: 'Informática', color: '#10b981', topics: [{ id: 't3', title: 'Segurança da Informação', completed: false, importance: 5 }] }
      ]
    }
  ]);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  const fetchUserData = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data: subData, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (!error && subData) {
      setSubjects(subData.map((s, index) => ({
        ...s,
        id: String(s.id),
        topics: s.topics || [],
        color: colors[index % colors.length]
      })));
    }
  }, [colors]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase) {
        setIsLoaded(true);
        return;
      }

      // 1. Checar sessão existente
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'Usuário',
          email: session.user.email!,
          role: session.user.email === 'ralysonriccelli@gmail.com' ? 'admin' : 'student',
          status: 'active',
          isOnline: true
        };
        setUser(u);
        await fetchUserData(session.user.id);
      }
      setIsLoaded(true);

      // 2. Escutar mudanças (Login/Logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const u: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 'Usuário',
            email: session.user.email!,
            role: session.user.email === 'ralysonriccelli@gmail.com' ? 'admin' : 'student',
            status: 'active',
            isOnline: true
          };
          setUser(u);
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubjects([]);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, [fetchUserData]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSubjects([]);
    setCurrentPage('inicio');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Iniciando Fluxo...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Login 
        users={[]} 
        onLogin={(u) => { setUser(u); fetchUserData(u.id); }} 
        onRegister={(u) => { setUser(u); fetchUserData(u.id); }} 
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'inicio': return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />;
      case 'disciplinas': return <Disciplinas subjects={subjects} setSubjects={setSubjects} predefinedEditais={editais} onAddLog={() => {}} />;
      case 'ciclos': return <Ciclos subjects={subjects} setCycle={setCycle} cycle={cycle} />;
      case 'revisao': return <Revisao subjects={subjects} setSubjects={setSubjects} onAddLog={() => {}} />;
      case 'simulados': return <Simulados mocks={mocks} setMocks={setMocks} subjects={subjects} />;
      case 'admin_users': return <Admin users={allUsers} setUsers={setAllUsers} editais={editais} setEditais={setEditais} view="users" />;
      case 'admin_editais': return <Admin users={allUsers} setUsers={setAllUsers} editais={editais} setEditais={setEditais} view="editais" />;
      default: return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-500">
      <button className="md:hidden fixed top-6 left-6 z-50 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Award size={28} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">StudyFlow</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Concursos</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {[
              { id: 'inicio', label: 'Início', icon: <Home size={18} /> },
              { id: 'disciplinas', label: 'Disciplinas', icon: <BookOpen size={18} /> },
              { id: 'ciclos', label: 'Ciclos AI', icon: <BrainCircuit size={18} /> },
              { id: 'revisao', label: 'Revisão', icon: <RefreshCcw size={18} /> },
              { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={18} /> },
            ].map((item) => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800">
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-rose-500 font-bold text-xs p-3 hover:bg-rose-50 rounded-xl"><LogOut size={16} /> Sair</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 overflow-y-auto bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto p-6 md:p-12">{renderPage()}</div>
      </main>
    </div>
  );
};

export default App;
