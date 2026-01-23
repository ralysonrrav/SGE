
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
  Plus,
  Trash2,
  CheckCircle2,
  BrainCircuit,
  Award,
  Sun,
  Moon,
  ShieldAlert,
  Users,
  Database,
  UserCircle,
  Lock
} from 'lucide-react';
import { User, Subject, MockExam, StudyCycle, StudySession, PredefinedEdital } from './types.ts'; // Adicione .ts
import Login from './components/Login.tsx';           // Adicione .tsx
import Disciplinas from './components/Disciplinas.tsx'; // Adicione .tsx
import Ciclos from './components/Ciclos.tsx';           // Adicione .tsx
import Revisao from './components/Revisao.tsx';         // Adicione .tsx
import Simulados from './components/Simulados.tsx';     // Adicione .tsx
import Dashboard from './components/Dashboard.tsx';     // Adicione .tsx
import Admin from './components/Admin.tsx';             // Adicione .tsx
import Profile from './components/Profile.tsx';         // Adicione .tsx

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

  // CARREGAMENTO INICIAL
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedEditais = localStorage.getItem('global_editais');
      const savedAllUsers = localStorage.getItem('global_users');

      if (savedEditais) setPredefinedEditais(JSON.parse(savedEditais));
      if (savedAllUsers) setAllUsers(JSON.parse(savedAllUsers));

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        const allUsersList = savedAllUsers ? JSON.parse(savedAllUsers) : [];
        const globalUser = allUsersList.find((u: User) => u.id === parsedUser.id);
        
        if (globalUser && globalUser.status === 'active') {
          setUser({ ...parsedUser, isOnline: true });
          
          const sSubs = localStorage.getItem(`subjects_${parsedUser.id}`);
          if (sSubs) setSubjects(JSON.parse(sSubs));
          
          const sMocks = localStorage.getItem(`mocks_${parsedUser.id}`);
          if (sMocks) setMocks(JSON.parse(sMocks));
          
          const sCycle = localStorage.getItem(`cycle_${parsedUser.id}`);
          if (sCycle) setCycle(JSON.parse(sCycle));
          
          const sLogs = localStorage.getItem(`logs_${parsedUser.id}`);
          if (sLogs) setStudyLogs(JSON.parse(sLogs));
        }
      }
    } catch (error) {
      console.error("Erro ao recuperar dados:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // SALVAMENTO AUTOMÁTICO
  useEffect(() => {
    if (!isLoaded) return;

    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        if (user.role !== 'admin') {
          localStorage.setItem(`subjects_${user.id}`, JSON.stringify(subjects));
          localStorage.setItem(`mocks_${user.id}`, JSON.stringify(mocks));
          localStorage.setItem(`logs_${user.id}`, JSON.stringify(studyLogs));
          if (cycle) localStorage.setItem(`cycle_${user.id}`, JSON.stringify(cycle));
        }
      }
      localStorage.setItem('global_editais', JSON.stringify(predefinedEditais));
      localStorage.setItem('global_users', JSON.stringify(allUsers));
    } catch (error) {
      console.error("Erro ao persistir dados:", error);
    }
  }, [subjects, mocks, cycle, user, studyLogs, predefinedEditais, allUsers, isLoaded]);

  // FUNÇÕES DE BACKUP
  const handleExportData = () => {
    if (!user) return;
    const backup = {
      user: {
        weeklyGoal: user.weeklyGoal,
        name: user.name,
        email: user.email,
        role: user.role
      },
      subjects,
      mocks,
      cycle,
      studyLogs,
      exportDate: new Date().toISOString(),
      version: '1.2'
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyflow_backup_${user.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (!result || typeof result !== 'string') return;
        
        const data = JSON.parse(result);
        
        if (!data.subjects || !Array.isArray(data.subjects)) {
          throw new Error("Arquivo de backup inválido: dados de disciplinas não encontrados.");
        }

        if (user) {
          localStorage.setItem(`subjects_${user.id}`, JSON.stringify(data.subjects));
          localStorage.setItem(`mocks_${user.id}`, JSON.stringify(data.mocks || []));
          localStorage.setItem(`logs_${user.id}`, JSON.stringify(data.studyLogs || []));
          
          if (data.cycle) {
            localStorage.setItem(`cycle_${user.id}`, JSON.stringify(data.cycle));
          } else {
            localStorage.removeItem(`cycle_${user.id}`);
          }

          if (data.user) {
            const updatedUser = { 
              ...user, 
              weeklyGoal: data.user.weeklyGoal || user.weeklyGoal,
              role: data.user.role || user.role 
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }

          alert("Backup restaurado com sucesso! O sistema será reiniciado para aplicar as mudanças.");
          window.location.reload();
        }
      } catch (err: any) {
        alert("Falha na restauração: " + err.message);
      }
    };
    reader.onerror = () => alert("Erro ao ler o arquivo selecionado.");
    reader.readAsText(file);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    
    // TRAVA DE SEGURANÇA: Administrador não pode ser excluído
    if (targetUser?.role === 'admin') {
      alert("ERRO CRÍTICO: Contas com perfil de Administrador são protegidas e não podem ser excluídas do sistema.");
      return;
    }

    if (confirm("Deseja realmente excluir esta conta? Todos os dados serão perdidos.")) {
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      if (user?.id === userId) {
        localStorage.removeItem('user');
        localStorage.removeItem(`subjects_${userId}`);
        localStorage.removeItem(`mocks_${userId}`);
        localStorage.removeItem(`logs_${userId}`);
        localStorage.removeItem(`cycle_${userId}`);
        setUser(null);
      }
    }
  };

  if (!user) {
    return <Login onLogin={(u) => { 
      const globalUsers = JSON.parse(localStorage.getItem('global_users') || '[]');
      const existingUser = globalUsers.find((gu: User) => gu.email.toLowerCase() === u.email.toLowerCase());
      
      if (existingUser && existingUser.status === 'blocked') {
        alert("Acesso negado: Esta conta está bloqueada.");
        return;
      }

      const loggedInUser: User = { ...u, isOnline: true, status: u.status || 'active' };
      setUser(loggedInUser); 
      setAllUsers(prev => {
        const exists = prev.find(p => p.email.toLowerCase() === u.email.toLowerCase());
        if (exists) return prev.map(p => p.email.toLowerCase() === u.email.toLowerCase() ? { ...p, lastAccess: new Date().toISOString(), isOnline: true } : p);
        return [...prev, loggedInUser];
      });
    }} />;
  }

  const getNavItems = () => {
    if (user.role === 'admin') {
      return [
        { id: 'admin_dashboard', label: 'Gestão de Usuários', icon: <Users size={20} /> },
        { id: 'admin_editais', label: 'Catálogo de Editais', icon: <Database size={20} /> },
      ];
    }

    if (user.role === 'visitor') {
      return [
        { id: 'inicio', label: 'Início', icon: <Home size={20} /> },
        { id: 'restricted', label: 'Acesso Restrito', icon: <Lock size={20} />, disabled: true },
      ];
    }

    return [
      { id: 'inicio', label: 'Início', icon: <Home size={20} /> },
      { id: 'disciplinas', label: 'Disciplinas', icon: <BookOpen size={20} /> },
      { id: 'ciclos', label: 'Ciclos AI', icon: <BrainCircuit size={20} /> },
      { id: 'revisao', label: 'Revisão', icon: <RefreshCcw size={20} /> },
      { id: 'simulados', label: 'Simulados', icon: <BarChart2 size={20} /> },
    ];
  };

  const currentNavItems = getNavItems();

  const handleLogout = () => {
    setAllUsers(prev => prev.map(p => p.id === user.id ? { ...p, isOnline: false } : p));
    setUser(null);
    localStorage.removeItem('user');
  };

  const renderPage = () => {
    if (user.role === 'admin') {
      return (
        <Admin 
          users={allUsers} 
          setUsers={setAllUsers}
          editais={predefinedEditais} 
          setEditais={setPredefinedEditais} 
          view={currentPage.includes('dashboard') ? 'users' : 'editais'}
        />
      );
    }

    if (user.role === 'visitor' && currentPage !== 'inicio') {
      setCurrentPage('inicio');
    }

    switch (currentPage) {
      case 'inicio': return (
        <Dashboard 
          subjects={subjects} 
          mocks={mocks} 
          cycle={cycle} 
          studyLogs={studyLogs} 
          weeklyGoal={user.weeklyGoal || 20}
          onUpdateGoal={(hours) => handleUpdateUser({ ...user, weeklyGoal: hours })}
          isDarkMode={isDarkMode}
        />
      );
      case 'disciplinas': return (
        <Disciplinas 
          subjects={subjects} 
          setSubjects={setSubjects} 
          predefinedEditais={predefinedEditais}
          onAddLog={(minutes, topicId, subjectId) => setStudyLogs(prev => [...prev, { id: Date.now().toString(), minutes, topicId, subjectId, date: new Date().toISOString(), type: 'estudo' }])}
        />
      );
      case 'ciclos': return <Ciclos subjects={subjects} setCycle={setCycle} cycle={cycle} />;
      case 'revisao': return (
        <Revisao 
          subjects={subjects} 
          setSubjects={setSubjects} 
          onAddLog={(minutes, topicId, subjectId) => setStudyLogs(prev => [...prev, { id: Date.now().toString(), minutes, topicId, subjectId, date: new Date().toISOString(), type: 'revisao' }])}
        />
      );
      case 'simulados': return <Simulados mocks={mocks} setMocks={setMocks} subjects={subjects} />;
      default: return <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={studyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={(hours) => handleUpdateUser({ ...user, weeklyGoal: hours })} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-500">
      <button 
        className="md:hidden fixed top-6 left-6 z-50 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl transition-all"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${user.role === 'admin' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
              {user.role === 'admin' ? <ShieldAlert size={28} /> : (user.role === 'visitor' ? <Lock size={28} /> : <Award size={28} />)}
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">StudyFlow</h1>
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none mt-1 ${user.role === 'admin' ? 'text-rose-600' : 'text-indigo-600'}`}>
                {user.role === 'admin' ? 'Painel Admin' : (user.role === 'visitor' ? 'Visitante' : 'Concursos AI')}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {currentNavItems.map((item: any) => (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => { 
                    if (!item.disabled) {
                        setCurrentPage(item.id); 
                        setIsSidebarOpen(false); 
                    }
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all
                  ${item.disabled ? 'opacity-40 cursor-not-allowed text-slate-400' : 
                    currentPage === item.id 
                    ? (user.role === 'admin' ? 'bg-rose-600 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-lg') 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="bg-slate-200 dark:bg-slate-950 p-1 rounded-2xl flex items-center border border-slate-300 dark:border-slate-800">
              <button onClick={() => setIsDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${!isDarkMode ? 'bg-white text-indigo-600 shadow-md font-black' : 'text-slate-500 font-bold'}`}>
                <Sun size={18} /> <span className="text-xs">Claro</span>
              </button>
              <button onClick={() => setIsDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md font-black border border-slate-700' : 'text-slate-500 font-bold'}`}>
                <Moon size={18} /> <span className="text-xs">Escuro</span>
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
              <div 
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 cursor-pointer hover:scale-105 transition-transform ${user.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}
                onClick={() => setIsProfileOpen(true)}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1">Configurações <UserCircle size={10} /></p>
              </div>
              <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 overflow-y-auto bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="max-w-6xl mx-auto p-6 md:p-12">
          {renderPage()}
        </div>
      </main>

      {isProfileOpen && (
        <Profile 
          user={user} 
          onUpdate={handleUpdateUser} 
          onDelete={() => handleDeleteUser(user.id)} 
          onClose={() => setIsProfileOpen(false)}
          onExport={handleExportData}
          onImport={handleImportData}
        />
      )}
    </div>
  );
};

export default App;
