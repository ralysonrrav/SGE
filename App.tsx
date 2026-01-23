
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  BookOpen, 
  RefreshCcw, 
  Calendar, 
  BarChart2, 
  LogOut, 
  Menu, 
  X,
  BrainCircuit,
  Award,
  Sun,
  Moon,
  ShieldAlert,
  Users,
  Database,
  Zap,
  Target,
  AlertCircle
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
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('inicio');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mocks, setMocks] = useState<MockExam[]>([]);
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [predefinedEditais, setPredefinedEditais] = useState<PredefinedEdital[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsLoaded(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userData: User = {
            id: profile.id,
            name: profile.name,
            email: session.user.email!,
            role: profile.role,
            status: profile.status,
            isOnline: true,
            weeklyGoal: profile.weekly_goal || 20
          };
          setUser(userData);
          fetchUserData(userData.id);
        }
      }
      setIsLoaded(true);
    };

    checkAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          checkAuth();
        } else {
          setUser(null);
          setSubjects([]);
          setMocks([]);
          setStudyLogs([]);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;

    const { data: subData } = await supabase
      .from('subjects')
      .select('*, topics(*)')
      .eq('user_id', userId);
    
    if (subData) setSubjects(subData);

    const { data: mockData } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('user_id', userId);
    
    if (mockData) setMocks(mockData);

    const { data: logData } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId);
    
    if (logData) setStudyLogs(logData);

    const { data: cycleData } = await supabase
      .from('study_cycles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (cycleData) setCycle(cycleData);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    if (!supabase) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        name: updatedUser.name, 
        weekly_goal: updatedUser.weeklyGoal 
      })
      .eq('id', updatedUser.id);
    
    if (error) console.error("Erro ao atualizar perfil:", error);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Erro de Conexão</h2>
          <p className="text-slate-500 mt-4 font-medium">O banco de dados (Supabase) não foi configurado corretamente através das variáveis de ambiente.</p>
          <p className="text-xs text-slate-400 mt-6 uppercase font-black tracking-widest">Verifique o arquivo .env ou segredos da Vercel</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login users={[]} onLogin={() => {}} onRegister={() => {}} />;
  }

  const renderPage = () => {
    if (user.role === 'admin') {
      return (
        <Admin 
          users={allUsers} setUsers={setAllUsers}
          editais={predefinedEditais} setEditais={setPredefinedEditais} 
          view={currentPage.includes('dashboard') ? 'users' : 'editais'}
        />
      );
    }

    switch (currentPage) {
      case 'inicio': return (
        <Dashboard 
          subjects={subjects} mocks={mocks} cycle={cycle} 
          studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20}
          onUpdateGoal={(hours) => handleUpdateUser({ ...user, weeklyGoal: hours })}
          isDarkMode={isDarkMode}
        />
      );
      case 'disciplinas': return (
        <Disciplinas 
          subjects={subjects} setSubjects={setSubjects} 
          predefinedEditais={predefinedEditais}
          onAddLog={(minutes, topicId, subjectId) => {
            const newLog: StudySession = { id: Date.now().toString(), minutes, topicId, subjectId, date: new Date().toISOString(), type: 'estudo' };
            setStudyLogs(prev => [...prev, newLog]);
          }}
        />
      );
      case 'ciclos': return <Ciclos subjects={subjects} setCycle={setCycle} cycle={cycle} />;
      case 'revisao': return (
        <Revisao 
          subjects={subjects} setSubjects={setSubjects} 
          onAddLog={(minutes, topicId, subjectId) => {
            const newLog: StudySession = { id: Date.now().toString(), minutes, topicId, subjectId, date: new Date().toISOString(), type: 'revisao' };
            setStudyLogs(prev => [...prev, newLog]);
          }}
        />
      );
      case 'simulados': return <Simulados mocks={mocks} setMocks={setMocks} subjects={subjects} />;
      default: return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={(hours) => handleUpdateUser({ ...user, weeklyGoal: hours })} isDarkMode={isDarkMode} />;
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${user.role === 'admin' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
              {user.role === 'admin' ? <ShieldAlert size={28} /> : <Award size={28} />}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">StudyFlow</h1>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${user.role === 'admin' ? 'text-rose-600' : 'text-indigo-600'}`}>
                {user.role === 'admin' ? 'Admin' : 'Concursos'}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {(user.role === 'admin' ? [
              { id: 'admin_dashboard', label: 'Gestão de Usuários', icon: <Users size={20} /> },
              { id: 'admin_editais', label: 'Catálogo de Editais', icon: <Database size={20} /> },
            ] : [
              { id: 'inicio', label: 'Início', icon: <Home size={20} /> },
              { id: 'disciplinas', label: 'Disciplinas', icon: <BookOpen size={20} /> },
              { id: 'ciclos', label: 'Ciclos AI', icon: <BrainCircuit size={20} /> },
              { id: 'revisao', label: 'Revisão', icon: <RefreshCcw size={20} /> },
              { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={20} /> },
            ]).map((item) => (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="bg-slate-200 dark:bg-slate-950 p-1 rounded-2xl flex items-center">
              <button onClick={() => setIsDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${!isDarkMode ? 'bg-white text-indigo-600 shadow-md font-black' : 'text-slate-500'}`}>
                <Sun size={18} /> <span className="text-xs">Claro</span>
              </button>
              <button onClick={() => setIsDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md font-black' : 'text-slate-500'}`}>
                <Moon size={18} /> <span className="text-xs">Escuro</span>
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 relative group">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 truncate cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">Configurações</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 overflow-y-auto bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-6xl mx-auto p-6 md:p-12">
          {renderPage()}
        </div>
      </main>

      {isProfileOpen && (
        <Profile 
          user={user} onUpdate={handleUpdateUser} 
          onDelete={() => {}} 
          onClose={() => setIsProfileOpen(false)}
          onExport={() => {}} onImport={() => {}}
        />
      )}
    </div>
  );
};

export default App;
