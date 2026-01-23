
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Award, Lock, Mail, User as UserIcon, Info, AlertTriangle } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError({ msg: "Banco de dados não configurado.", type: 'error' });
      return;
    }

    setLoading(true);

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError({ msg: "As senhas não coincidem!", type: 'error' });
        setLoading(false);
        return;
      }
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (signUpError) {
        setError({ msg: signUpError.message, type: 'error' });
      } else if (data.user) {
        setError({ msg: "Cadastro realizado! Verifique seu e-mail.", type: 'info' });
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError({ msg: "E-mail ou senha incorretos.", type: 'error' });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6">
            <Award size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {isRegistering ? 'Criar Conta' : 'StudyFlow'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Sua jornada para a aprovação.</p>
        </div>

        {!supabase && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-[10px] font-black uppercase">Database Offline: Verifique as credenciais.</p>
          </div>
        )}

        {error && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border ${
            error.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' :
            error.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
            'bg-sky-50 border-sky-100 text-sky-700'
          }`}>
            <Info size={18} className="shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{error.msg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Nome Completo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="email" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="password" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Sua Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {isRegistering && (
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" required className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading || !supabase}
            className={`w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl bg-indigo-600 hover:bg-indigo-700 ${(loading || !supabase) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'CARREGANDO...' : (isRegistering ? 'CRIAR CONTA' : 'ACESSAR AGORA')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">
            {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
