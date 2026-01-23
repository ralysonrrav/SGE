
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, Award, Lock, Mail, User as UserIcon, Info, 
  RefreshCw, Sparkles, HelpCircle, Terminal, Eye
} from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showHelp, setShowHelp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' | 'success'; code?: string } | null>(null);

  const handleDemoAccess = () => {
    // Role: 'visitor' garante que a UI mostre os banners de demo e desabilite saves.
    const demoUser: User = {
      id: 'demo-visitor-id',
      name: 'Visitante (Demo)',
      email: 'demo@studyflow.com',
      role: 'visitor',
      status: 'active',
      isOnline: true,
      weeklyGoal: 20
    };
    onLogin(demoUser);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email) return;
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (resetError) {
      setError({ msg: resetError.message, type: 'error' });
    } else {
      setError({ msg: "Link de recuperação enviado. Verifique sua caixa (incluindo SPAM).", type: 'success' });
      setTimeout(() => setMode('login'), 3000);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError({ msg: "Erro: Conexão com banco de dados não disponível.", type: 'error' });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError({ msg: "As senhas não coincidem!", type: 'error' });
          setLoading(false);
          return;
        }
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });

        if (signUpError) throw signUpError;
        
        if (data.user) {
          if (data.session) {
            setError({ msg: "Conta criada! Entrando...", type: 'success' });
            onRegister({
              id: data.user.id,
              name: name || 'Usuário',
              email: email,
              role: 'student',
              status: 'active',
              isOnline: true
            });
          } else {
            setError({ 
              msg: "Usuário cadastrado com sucesso. Verifique seu e-mail.", 
              type: 'success'
            });
            setShowHelp(true);
          }
        }
      } else if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        if (data.session && data.user) {
          setError({ msg: "Privilégios Verificados! Carregando painel...", type: 'success' });
          
          setTimeout(() => {
            onLogin({
              id: data.user!.id,
              name: data.user!.user_metadata?.full_name || 'Usuário',
              email: data.user!.email!,
              role: data.user!.email === 'ralysonriccelli@gmail.com' ? 'administrator' : 'student',
              status: 'active',
              isOnline: true
            });
          }, 800);
        }
      }
    } catch (err: any) {
      console.error("Erro de Autenticação:", err);
      let message = err.message;
      if (message.includes("Invalid login credentials")) {
        message = "E-mail ou senha incorretos.";
      }
      setError({ msg: message, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden border border-slate-100 dark:border-slate-800 transition-all">
        <div className="text-center mb-10 relative">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6 transform hover:rotate-6 transition-transform">
            <Award size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {mode === 'register' ? 'Criar Conta' : mode === 'forgot' ? 'Recuperar Acesso' : 'StudyFlow'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Painel de Controle Inteligente
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-2xl flex flex-col gap-3 border animate-in slide-in-from-top-2 ${
            error.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' :
            error.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
            'bg-sky-50 border-sky-100 text-sky-700'
          }`}>
            <div className="flex items-start gap-3">
              <Info size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{error.msg}</p>
            </div>
          </div>
        )}

        <form onSubmit={mode === 'forgot' ? handleResetPassword : handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input type="text" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold transition-all" placeholder="Seu Nome Completo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input type="email" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold transition-all" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          
          {mode !== 'forgot' && (
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input type="password" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold transition-all" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          {mode === 'register' && (
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input type="password" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold transition-all" placeholder="Repetir Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl bg-indigo-600 hover:bg-indigo-700 transform active:scale-[0.98] flex items-center justify-center gap-3 ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            {loading && <RefreshCw className="animate-spin" size={18} />}
            {loading ? 'SINCRONIZANDO...' : (mode === 'register' ? 'CRIAR MINHA CONTA' : mode === 'forgot' ? 'ENVIAR LINK DE RECUPERAÇÃO' : 'ENTRAR NO PAINEL')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setShowHelp(false); }} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">
            {mode === 'login' ? 'Novo por aqui? Criar conta grátis' : 'Já possui cadastro? Acessar'}
          </button>

          <div className="flex items-center justify-between">
             <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-slate-400 hover:text-indigo-500">Recuperar senha</button>
             <button type="button" onClick={() => setShowHelp(!showHelp)} className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-1 hover:text-indigo-500 transition-colors"><HelpCircle size={10} /> Suporte</button>
          </div>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OU EXPLORE</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <button 
            onClick={handleDemoAccess}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-amber-50 dark:border-slate-800 text-amber-600 dark:text-amber-500 font-black text-xs hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group shadow-sm"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
            MODO VISITANTE (DEGUSTAÇÃO)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
