
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, User as UserIcon, Mail, Lock, Trash2, ShieldCheck, AlertTriangle, Download, Upload, ShieldAlert } from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  onDelete: () => void;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onDelete, onClose, onExport, onImport }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...user, name, email });
    alert("Perfil atualizado com sucesso!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    onUpdate({ ...user, password: newPassword });
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    alert("Senha alterada com sucesso!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm("Isso substituirá todos os seus dados atuais (disciplinas, simulados, etc). Continuar?")) {
        onImport(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg font-black text-xl">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Configurações da Conta</h3>
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Gerencie seu perfil e dados</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <form onSubmit={handleUpdateInfo} className="space-y-4">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <UserIcon size={14} className="text-indigo-500" /> DADOS PESSOAIS
                </h4>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input 
                    type="email" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-3 rounded-xl text-xs hover:bg-indigo-600 transition-colors">
                    SALVAR ALTERAÇÕES
                  </button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Lock size={14} className="text-indigo-500" /> SEGURANÇA
                </h4>
                <div className="space-y-3">
                  <input 
                    type="password" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nova Senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input 
                    type="password" 
                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Confirmar Nova Senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none">
                    ATUALIZAR SENHA
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-8">
              <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-slate-100 leading-none">Segurança de Dados</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Backup local offline</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Seus dados estão salvos neste navegador. Para garantir total segurança, baixe um backup manual regularmente.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={onExport}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black py-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 transition-all shadow-sm"
                  >
                    <Download size={18} /> EXPORTAR BACKUP (.JSON)
                  </button>
                  
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black py-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-200 transition-all shadow-sm"
                  >
                    <Upload size={18} /> RESTAURAR BACKUP
                  </button>
                </div>
              </div>

              {/* TRAVA DE SEGURANÇA: Administrador não pode se auto-excluir */}
              {/* Fix: Comparing with 'administrator' instead of 'admin' to match User role types */}
              {user.role !== 'administrator' ? (
                <div className="flex flex-col items-center gap-4 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zona de Risco</p>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-rose-500 font-black text-xs hover:bg-rose-50 dark:hover:bg-rose-900/10 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                  >
                    <Trash2 size={16} /> EXCLUIR CONTA PERMANENTEMENTE
                  </button>
                </div>
              ) : (
                <div className="pt-6 text-center">
                   <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 font-bold text-[10px] uppercase">
                     <ShieldCheck size={14} /> Conta de Administrador Protegida
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 text-center border border-slate-100 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-4">Ação Irreversível</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
              Tem certeza que deseja excluir sua conta? Todos os seus ciclos, estatísticas e disciplinas serão removidos permanentemente deste dispositivo.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={onDelete} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 dark:shadow-none">SIM, EXCLUIR TUDO</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-colors">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
