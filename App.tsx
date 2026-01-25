
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, BookOpen, RefreshCcw, BarChart2, LogOut, Menu,
  BrainCircuit, Users, Settings, Loader2, Lock, ShieldCheck, Calendar
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

const PAGE_BACKGROUNDS: Record<string, string> = {
  'inicio': 'https://png.pngtree.com/background/20230519/pngtree-a-black-coffee-mug-sits-atop-stack-of-vintage-books-in-image_2661730.jpg', 
  'disciplinas': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=2070', 
  'revisao': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=2070', 
  'ciclos': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=2070', 
  'simulados': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=2070', 
  'admin_users': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070',
  'admin_editais': 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('inicio');
  const [subjects, setSubjects] = useState<Subject[] | null>(null); 
  const [mocks, setMocks] = useState<MockExam[]>([]);
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [bottomStudyLogs, setStudyLogs] = useState<StudySession[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editais, setEditais] = useState<PredefinedEdital[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const loggingOutRef = useRef(false);

  const fetchData = useCallback(async (userId: string, role: string) => {
    if (!supabase || loggingOutRef.current) return;
    
    try {
      const [subRes, logRes, mockRes, cycleRes, editalRes, profileRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('study_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('mocks').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('study_cycles').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('predefined_editais').select('*'),
        supabase.from('profiles').select('exam_date, weekly_goal').eq('id', userId).single()
      ]);

      if (subRes.data) {
        setSubjects(subRes.data.map(s => ({
          ...s,
          id: String(s.id),
          topics: typeof s.topics === 'string' ? JSON.parse(s.topics) : (s.topics || [])
        })));
      } else {
        setSubjects([]);
      }

      if (logRes.data) {
        setStudyLogs(logRes.data.map(l => ({ 
          ...l, 
          id: String(l.id), 
          topicId: l.topic_id, 
          subjectId: String(l.subject_id) 
        })));
      }

      if (mockRes.data) setMocks(mockRes.data.map(m => ({ ...m, id: String(m.id), totalQuestions: m.total_questions, subjectPerformance: m.subject_performance || {} })));
      if (cycleRes.data?.[0]) setCycle({ ...cycleRes.data[0], id: String(cycleRes.data[0].id) });
      if (editalRes.data) setEditais(editalRes.data.map(e => ({ ...e, id: String(e.id), examDate: e.exam_date, lastUpdated: e.last_updated })));

      if (profileRes.data) {
        setUser(prev => prev ? { 
          ...prev, 
          examDate: profileRes.data.exam_date, 
          weeklyGoal: profileRes.data.weekly_goal || 20 
        } : null);
      }

      if (role === 'administrator') {
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) setAllUsers(profiles.map(p => ({ ...p, id: String(p.id), name: p.name || 'Usuário', lastAccess: p.last_seen })));
      }
    } catch (e: any) {
      console.error("[Data-Sync] Falha no isolamento:", e);
      setSubjects([]);
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
    if (user && supabase) {
      setUser({ ...user, examDate: date });
      try {
        const { error } = await supabase.from('profiles').update({ exam_date: date }).eq('id', user.id);
        if (error) throw error;
        console.log("[CORE] Data da prova sincronizada:", date);
      } catch (e) {
        console.error("[CORE] Falha ao salvar data da prova:", e);
      }
    }
  };

  const handleUpdateGoal = async (hours: number) => {
    if (user && supabase) {
      setUser({ ...user, weeklyGoal: hours });
      try {
        const { error } = await supabase.from('profiles').update({ weekly_goal: hours }).eq('id', user.id);
        if (error) throw error;
        console.log("[CORE] Meta semanal sincronizada:", hours);
      } catch (e) {
        console.error("[CORE] Falha ao salvar meta semanal:", e);
      }
    }
  };

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setIsLoggingOut(true);
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSubjects(null);
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

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-main-overlay opacity-20" style={{ backgroundImage: `url('${PAGE_BACKGROUNDS[currentPage] || PAGE_BACKGROUNDS['inicio']}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent"></div>
        <div className="scanline"></div>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-50 w-52 glass-panel transform transition-all duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-2 cursor-pointer group" onClick={() => setCurrentPage('inicio')}>
            <BrainCircuit className="text-indigo-500" size={24} />
            <h1 className="text-xl font-black text-white">FLOW</h1>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {[
              { id: 'inicio', label: 'HUB', icon: <LayoutDashboard size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'disciplinas', label: 'QUESTS', icon: <BookOpen size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'revisao', label: 'SYNC', icon: <RefreshCcw size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'ciclos', label: 'PLAN', icon: <BrainCircuit size={16} />, roles: ['administrator', 'student', 'visitor'] },
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
           
           <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-full border border-white/5">
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
            {currentPage === 'disciplinas' && <Disciplinas user={user} subjects={subjects || []} setSubjects={setSubjects as any} predefinedEditais={editais} onAddLog={handleAddLogLocally} onUpdateExamDate={handleUpdateExamDate} />}
            {currentPage === 'revisao' && <Revisao user={user} subjects={subjects || []} setSubjects={setSubjects as any} onAddLog={handleAddLogLocally} />}
            {currentPage === 'ciclos' && <Ciclos user={user} subjects={subjects || []} cycle={cycle} setCycle={setCycle} />}
            {currentPage === 'simulados' && <Simulados user={user} mocks={mocks} setMocks={setMocks} subjects={subjects || []} />}
            {currentPage === 'admin_users' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="users" editais={editais} setEditais={setEditais} />}
            {currentPage === 'admin_editais' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="editais" editais={editais} setEditais={setEditais} />}
          </div>
        </div>
      </main>

      {isProfileOpen && <Profile user={user} onUpdate={()=>{}} onDelete={handleLogout} onClose={() => setIsProfileOpen(false)} onExport={()=>{}} onImport={()=>{}} />}
    </div>
  );
};

export default App;
