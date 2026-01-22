
import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Award, Lock, Mail, User as UserIcon, AlertCircle, UserPlus, ShieldAlert, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' } | null>(null);

  const isAdminEmail = (emailToCheck: string) => emailToCheck.toLowerCase() === 'admin@studyflow.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) return;

    const allUsersStr = localStorage.getItem('global_users');
    let allUsers: User[] = allUsersStr ? JSON.parse(allUsersStr) : [];

    // Tenta carregar contador de falhas específico deste e-mail
    const failedAttemptsKey = `failed_attempts_${email.toLowerCase()}`;
    const failedAttemptsStr = localStorage.getItem(failedAttemptsKey);
    let failedAttempts = failedAttemptsStr ? parseInt(failedAttemptsStr) : 0;

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError({ msg: "As senhas não coincidem!", type: 'error' });
        return;
      }
      if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError({ msg: "Este e-mail já está cadastrado no sistema.", type: 'warning' });
        return;
      }

      const role = isAdminEmail(email) ? 'admin' : 'visitor';
      
      const newUser: User = {
        id: 'user_' + Date.now(),
        name,
        email,
        password, 
        role,
        status: 'active',
        isOnline: false,
        lastAccess: new Date().toISOString()
      };
      
      localStorage.setItem('global_users', JSON.stringify([...allUsers, newUser]));
      alert("Cadastro realizado com sucesso! Você inicia com perfil Visitante.");
      onLogin(newUser);
    } else {
      const foundUserIndex = allUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      const foundUser = allUsers[foundUserIndex];

      // Verificação de Usuário Inexistente
      if (!foundUser && !isAdminEmail(email)) {
        setError({ msg: "Usuário não cadastrado. Por favor, realize o seu cadastro.", type: 'info' });
        return;
      }

      // Verificação de Status Bloqueado (Ignora se for admin)
      if (foundUser?.status === 'blocked' && !isAdminEmail(email)) {
        setError({ msg: "ESTA CONTA ESTÁ BLOQUEADA! Múltiplas tentativas falhas detectadas. Contate o suporte.", type: 'error' });
        return;
      }

      // Validação de Senha
      const isCorrectPassword = foundUser 
        ? foundUser.password === password 
        : (isAdminEmail(email) && password === 'admin');

      if (isCorrectPassword) {
        localStorage.removeItem(failedAttemptsKey);
        if (foundUser) {
          onLogin({ ...foundUser, lastAccess: new Date().toISOString(), isOnline: true });
        } else {
          // Fallback Admin
          onLogin({
            id: 'admin_01',
            name: 'Administrador Master',
            email: 'admin@studyflow.com',
            password: 'admin',
            role: 'admin',
            status: 'active',
            isOnline: true,
            lastAccess: new Date().toISOString()
          });
        }
      } else {
        // Lógica de Erro e Bloqueio
        failedAttempts++;
        localStorage.setItem(failedAttemptsKey, failedAttempts.toString());

        if (failedAttempts >= 5) {
          if (isAdminEmail(email) || (foundUser && foundUser.role === 'admin')) {
            setError({ msg: `Senha incorreta. O administrador não pode ser bloqueado, mas verifique suas credenciais. (Tentativa ${failedAttempts})`, type: 'error' });
          } else {
            if (foundUserIndex !== -1) {
              allUsers[foundUserIndex].status = 'blocked';
              localStorage.setItem('global_users', JSON.stringify(allUsers));
            }
            setError({ msg: "USUÁRIO BLOQUEADO! Você atingiu o limite de 5 tentativas sem sucesso.", type: 'error' });
          }
        } else if (failedAttempts >= 3) {
          const remaining = 5 - failedAttempts;
          setError({ 
            msg: `ATENÇÃO: Senha incorreta! Você tem apenas mais ${remaining} ${remaining === 1 ? 'tentativa' : 'tentativas'} antes do bloqueio da conta.`, 
            type: 'warning' 
          });
        } else {
          setError({ msg: `Senha incorreta! Tentativa ${failedAttempts} de 5.`, type: 'error' });
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-16 -mt-16" />

        <div className="text-center mb-10 relative">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6 transition-transform hover:scale-105 cursor-pointer">
            <Award size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {isRegistering ? 'Criar Conta' : 'StudyFlow'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {isRegistering ? 'Junte-se aos futuros aprovados.' : 'Sua jornada para a aprovação começa aqui.'}
          </p>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 ${
            error.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400' :
            error.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
            'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800 text-sky-700 dark:text-sky-400'
          }`}>
            {error.type === 'error' ? <ShieldAlert size={18} className="shrink-0 mt-0.5" /> : 
             error.type === 'warning' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : 
             <Info size={18} className="shrink-0 mt-0.5" />}
            <p className="text-xs font-bold leading-relaxed">{error.msg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          {isRegistering && (
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold"
                placeholder="Seu Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input
              type="email"
              required
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input
              type="password"
              required
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold"
              placeholder="Sua Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegistering && (
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none font-bold"
                placeholder="Confirmar Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className={`w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 ${isRegistering ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isRegistering ? <UserPlus size={22} /> : <ShieldCheck size={22} />}
            {isRegistering ? 'CRIAR MINHA CONTA' : 'ACESSAR PLATAFORMA'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <button 
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
            }}
            className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline"
          >
            {isRegistering ? 'Já tenho uma conta. Fazer Login' : 'Não tem conta? Cadastre-se agora'}
          </button>
          {!isRegistering && (
             <div className="flex items-center justify-center gap-1.5 mt-4">
               <ShieldCheck size={12} className="text-slate-400" />
               <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-tighter">
                Admin Imune a Bloqueio • Limite 5 tentativas
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
