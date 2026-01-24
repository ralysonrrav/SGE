
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, Award, Lock, Mail, User as UserIcon, Info, 
  RefreshCw, Eye, BrainCircuit
} from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' | 'success' } | null>(null);

  const handleDemoAccess = () => {
    onLogin({
      id: 'demo-visitor-id',
      name: 'Visitante (Demo)',
      email: 'demo@studyflow.com',
      role: 'visitor',
      status: 'active',
      isOnline: true,
      weeklyGoal: 20
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) return;
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError({ msg: "As senhas não coincidem!", type: 'error' });
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        });
        if (signUpError) throw signUpError;
        if (data.user && data.session) {
           onRegister({ id: data.user.id, name: name || 'Usuário', email, role: 'student', status: 'active', isOnline: true });
        } else {
           setError({ msg: "Conta criada! Verifique seu e-mail para ativar.", type: 'success' });
        }
      } else if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.session && data.user) {
          onLogin({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || 'Usuário',
            email: data.user.email!,
            role: data.user.email === 'ralysonriccelli@gmail.com' ? 'administrator' : 'student',
            status: 'active',
            isOnline: true
          });
        }
      }
    } catch (err: any) {
      setError({ msg: err.message, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-study-dark flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-slate-950/80 pointer-events-none"></div>
      
      <div className="max-w-md w-full glass-card rounded-[3rem] p-12 relative z-10 border border-white/10 shadow-indigo-500/10 shadow-2xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter neo-glow">StudyFlow</h1>
          <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] mt-2">Plataforma Estratégica</p>
        </div>

        {error && (
          <div className={`mb-8 p-4 rounded-2xl flex items-start gap-3 border text-xs font-bold ${error.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <Info size={16} className="shrink-0" />
            <p>{error.msg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" required className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input type="email" required className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input type="password" required className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === 'register' && (
            <div className="relative">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="password" required className="w-full pl-14 pr-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          )}

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl mt-4 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
            {loading ? <RefreshCw className="animate-spin" size={18} /> : null}
            {mode === 'login' ? 'AUTENTICAR' : 'CRIAR CONTA'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
           <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400">
             {mode === 'login' ? 'Novo por aqui? Criar conta' : 'Já possui cadastro? Acessar'}
           </button>
           <div className="w-full flex items-center gap-4 py-2">
             <div className="flex-1 h-px bg-white/5"></div>
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Ou</span>
             <div className="flex-1 h-px bg-white/5"></div>
           </div>
           <button onClick={handleDemoAccess} className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
             <Eye size={14} /> Modo Visitante
           </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
