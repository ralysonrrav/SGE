
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, BookOpen, RefreshCcw, BarChart2, LogOut, Menu, X,
  BrainCircuit, Award, Sun, Moon, Loader2, User as UserIcon, AlertCircle
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('inicio');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mocks, setMocks] = useState<MockExam[]>([]);
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [studyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [editais] = useState<PredefinedEdital[]>([
    {
      id: 'edital-pf-agente',
      name: 'Agente da Polícia Federal',
      organization: 'PF / Cebraspe',
      lastUpdated: new Date().toISOString(),
      subjects: [
        { id: 'pf-1', name: 'Língua Portuguesa', topics: [{ id: 't1', title: 'Compreensão de textos', completed: false, importance: 5 }], color: '#6366f1' },
        { id: 'pf-2', name: 'Informática', topics: [{ id: 't3', title: 'Segurança da Informação', completed: false, importance: 5 }], color: '#10b981' }
      ]
    }
  ]);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const fetchSubjects = supabase.from('subjects').select('*').eq('user_id', userId).order('created_at', { ascending: true });
      const fetchMocks = supabase.from('mocks').select('*').eq('user_id', userId).order('date', { ascending: false });
      const fetchLogs = supabase.from('study_logs').select('*').eq('user_id', userId).order('date', { ascending: false });

      const [resSub, resMock, resLog] = await Promise.all([fetchSubjects, fetchMocks, fetchLogs]);

      if (resSub.data) setSubjects(resSub.data.map((s, index) => ({ ...s, id: String(s.id), topics: Array.isArray(s.topics) ? s.topics : [], color: COLORS[index % COLORS.length] })));
      if (resMock.data) setMocks(resMock.data.map(m => ({ ...m, id: String(m.id) })));
      if (resLog.data) setStudyLogs(resLog.data.map(l => ({ ...l, id: String(l.id) })));
    } catch (err) {
      console.warn("Falha ao carregar dados remotos.");
    }
  }, []);

  const handleWipeData = async () => {
    if (!user || !supabase) return;
    try {
      setIsLoaded(false);
      await Promise.all([
        supabase.from('subjects').delete().eq('user_id', user.id),
        supabase.from('mocks').delete().eq('user_id', user.id),
        supabase.from('study_logs').delete().eq('user_id', user.id)
      ]);
      setSubjects([]);
      setMocks([]);
      setStudyLogs([]);
      alert("Limpeza concluída com sucesso!");
    } catch (err) {
      alert("Erro ao limpar dados.");
    } finally {
      setIsLoaded(true);
      setShowProfile(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Força o carregamento após 3 segundos se o banco não responder
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoaded(true);
        setLoadError(true);
      }
    }, 3500);

    const init = async () => {
      try {
        if (!supabase) { setIsLoaded(true); return; }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user && isMounted) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || 'Usuário',
            email: session.user.email!,
            role: session.user.email === 'ralysonriccelli@gmail.com' ? 'admin' : 'student',
            status: 'active',
            isOnline: true
          });
          await fetchUserData(session.user.id);
        }
      } catch (err) {
        console.error("Erro no carregamento inicial:", err);
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setIsLoaded(true);
        }
      }
    };
    
    init();

    return () => { isMounted = false; clearTimeout(safetyTimer); };
  }, [fetchUserData]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-8">
           <div className="w-20 h-20 border-4 border-indigo-500/10 rounded-full"></div>
           <Loader2 className="absolute inset-0 animate-spin text-indigo-500" size={80} />
        </div>
        <h2 className="text-white font-black text-2xl mb-2">StudyFlow Pro</h2>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse mb-8">Sincronizando com a Nuvem...</p>
        
        {/* Botão de Bypass se demorar muito */}
        <button 
          onClick={() => setIsLoaded(true)}
          className="px-6 py-3 bg-slate-900 text-slate-400 rounded-2xl text-xs font-black border border-slate-800 hover:text-white transition-all flex items-center gap-2"
        >
          <AlertCircle size={14} /> ENTRAR MESMO ASSIM
        </button>
      </div>
    );
  }

  if (!user) {
    return <Login users={[]} onLogin={(u) => { setUser(u); fetchUserData(u.id); }} onRegister={(u) => { setUser(u); fetchUserData(u.id); }} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'inicio': return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />;
      case 'disciplinas': return <Disciplinas user={user} subjects={subjects} setSubjects={setSubjects} predefinedEditais={editais} onAddLog={() => {}} />;
      case 'ciclos': return <Ciclos user={user} subjects={subjects} setCycle={setCycle} cycle={cycle} />;
      case 'revisao': return <Revisao subjects={subjects} setSubjects={setSubjects} onAddLog={() => {}} />;
      case 'simulados': return <Simulados user={user} mocks={mocks} setMocks={setMocks} subjects={subjects} />;
      default: return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-500 font-sans">
      {showProfile && (
        <Profile user={user} onUpdate={(u) => setUser(u)} onDelete={handleWipeData} onClose={() => setShowProfile(false)} onExport={() => {}} onImport={() => {}} />
      )}

      <button className="md:hidden fixed top-6 left-6 z-50 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Award size={28} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">StudyFlow</h1>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-indigo-600">Concursos</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4">Navegação</p>
            {[
              { id: 'inicio', label: 'Dashboard', icon: <Home size={18} /> },
              { id: 'disciplinas', label: 'Edital Vertical', icon: <BookOpen size={18} /> },
              { id: 'ciclos', label: 'Ciclos AI', icon: <BrainCircuit size={18} /> },
              { id: 'revisao', label: 'Revisões', icon: <RefreshCcw size={18} /> },
              { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={18} /> },
            ].map((item) => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
             <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all">
                <UserIcon size={18} /> Minha Conta
             </button>
             <div className="bg-slate-200 dark:bg-slate-950 p-1 rounded-2xl flex items-center">
                <button onClick={() => setIsDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${!isDarkMode ? 'bg-white text-indigo-600 shadow-md font-black' : 'text-slate-400'}`}><Sun size={16} /></button>
                <button onClick={() => setIsDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md font-black' : 'text-slate-400'}`}><Moon size={16} /></button>
             </div>
             <button onClick={async () => { if (supabase) await supabase.auth.signOut(); setUser(null); }} className="w-full flex items-center justify-center gap-2 text-rose-500 font-bold text-xs p-3 hover:bg-rose-50 rounded-xl transition-all"><LogOut size={16} /> Sair</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 overflow-y-auto bg-white dark:bg-slate-950 transition-colors">
        {loadError && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all">
            <AlertCircle size={14} /> Modo de Segurança Ativado: Conexão com o banco lenta ou indisponível.
          </div>
        )}
        <div className="max-w-6xl mx-auto p-6 md:p-12">{renderPage()}</div>
      </main>
    </div>
  );
};

export default App;
