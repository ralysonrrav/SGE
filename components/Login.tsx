
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Award, Lock, Mail, User as UserIcon, Info, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';

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
  const [error, setError] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

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
        if (data.user) {
          setError({ msg: "Conta criada! Verifique seu e-mail ou faça login.", type: 'success' });
          if (data.session) onRegister({ id: data.user.id, name, email, role: 'student', status: 'active', isOnline: true });
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.session && data.user) {
          setError({ msg: "Login realizado! Redirecionando...", type: 'success' });
          onLogin({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || 'Usuário',
            email: data.user.email!,
            role: data.user.email === 'ralysonriccelli@gmail.com' ? 'admin' : 'student',
            status: 'active',
            isOnline: true
          });
        }
      }
    } catch (err: any) {
      setError({ msg: err.message === 'Invalid login credentials' ? "E-mail ou senha incorretos." : err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6"><Award size={40} /></div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">{mode === 'register' ? 'Criar Conta' : 'StudyFlow'}</h1>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-2xl text-xs font-bold border ${error.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
            {error.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <input type="text" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input type="email" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === 'register' && (
            <input type="password" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )}

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
            {loading && <RefreshCw className="animate-spin" size={18} />}
            {loading ? 'PROCESSANDO...' : (mode === 'register' ? 'CADASTRAR' : 'ENTRAR AGORA')}
          </button>
        </form>

        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;
