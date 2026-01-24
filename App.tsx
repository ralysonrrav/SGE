
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, BookOpen, RefreshCcw, BarChart2, LogOut, Menu,
  BrainCircuit, Users, Settings, Loader2
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
    } catch (e: any) {}
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
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <span className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500">Syncing System</span>
      </div>
    );
  }

  if (!user) return <Login users={allUsers} onLogin={(u) => { setUser(u); fetchData(u.id, u.role); }} onRegister={(u) => { setUser(u); fetchData(u.id, u.role); }} />;

  const currentBg = PAGE_BACKGROUNDS[currentPage] || PAGE_BACKGROUNDS['inicio'];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 bg-main-overlay opacity-30"
          style={{ backgroundImage: `url('${currentBg}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent vignette"></div>
        <div className="scanline"></div>
      </div>

      {/* Slim Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-52 glass-panel transform transition-all duration-500 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <BrainCircuit className="text-white" size={18} />
              </div>
              <h1 className="text-lg font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">FLOW</h1>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            {[
              { id: 'inicio', label: 'HUB', icon: <LayoutDashboard size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'disciplinas', label: 'QUESTS', icon: <BookOpen size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'revisao', label: 'SYNC', icon: <RefreshCcw size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'ciclos', label: 'PLAN', icon: <BrainCircuit size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'simulados', label: 'LOGS', icon: <BarChart2 size={16} />, roles: ['administrator', 'student', 'visitor'] },
              { id: 'admin_users', label: 'GOV', icon: <Users size={16} />, roles: ['administrator'] },
              { id: 'admin_editais', label: 'CORE', icon: <Settings size={16} />, roles: ['administrator'] },
            ].filter(i => i.roles.includes(user.role)).map(item => (
              <button 
                key={item.id} 
                onClick={() => { setCurrentPage(item.id); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all group ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <span className={currentPage === item.id ? 'text-white' : 'text-indigo-500 group-hover:text-indigo-400'}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 space-y-4 border-t border-white/5">
            <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all">
              <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">{user.name.charAt(0)}</div>
              <span className="text-[9px] font-black truncate text-white uppercase tracking-widest">{user.name.split(' ')[0]}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-rose-500/60 hover:text-rose-500 font-black text-[9px] uppercase tracking-widest transition-all">
              <LogOut size={12} /> EXIT
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 flex items-center justify-between px-10 border-b border-white/5 bg-slate-950/20 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-indigo-400" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
              <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">TERMINAL / <span className="text-white">{currentPage}</span></h2>
           </div>
           <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Live Sync</span>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1500px] mx-auto">
            {currentPage === 'inicio' && <Dashboard subjects={subjects} mocks={mocks} cycle={cycle} studyLogs={bottomStudyLogs} weeklyGoal={user.weeklyGoal || 20} onUpdateGoal={() => {}} isDarkMode={true} />}
            {currentPage === 'disciplinas' && <Disciplinas user={user} subjects={subjects} setSubjects={setSubjects} predefinedEditais={editais} onAddLog={addLog} />}
            {currentPage === 'revisao' && <Revisao user={user} subjects={subjects} setSubjects={setSubjects} onAddLog={addLog} />}
            {currentPage === 'ciclos' && <Ciclos user={user} subjects={subjects} cycle={cycle} setCycle={setCycle} />}
            {currentPage === 'simulados' && <Simulados user={user} mocks={mocks} setMocks={setMocks} subjects={subjects} />}
            {currentPage === 'admin_users' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="users" editais={editais} setEditais={setEditais} />}
            {currentPage === 'admin_editais' && <Admin user={user} users={allUsers} setUsers={setAllUsers} view="editais" editais={editais} setEditais={setEditais} />}
          </div>
        </div>
      </main>

      {isProfileOpen && <Profile user={user} onUpdate={(u) => { setUser(u); }} onDelete={handleLogout} onClose={() => setIsProfileOpen(false)} onExport={()=>{}} onImport={()=>{}} />}
    </div>
  );
};

export default App;
