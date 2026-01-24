
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-4xl rounded-[2.5rem] border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg font-black text-xl">
                {user.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">PERFIL DE USUÁRIO</h3>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.4em] mt-1">Configurações de Identidade e Segurança</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-10">
              <form onSubmit={handleUpdateInfo} className="space-y-6">
                <h4 className="font-black text-indigo-400 text-[10px] uppercase tracking-[0.3em] border-b border-white/5 pb-3 flex items-center gap-2">
                  <UserIcon size={14} /> DADOS CADASTRAIS
                </h4>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all"
                    placeholder="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input 
                    type="email" 
                    className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase hover:bg-indigo-500 transition-all shadow-xl">
                    ATUALIZAR IDENTIDADE
                  </button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <h4 className="font-black text-indigo-400 text-[10px] uppercase tracking-[0.3em] border-b border-white/5 pb-3 flex items-center gap-2">
                  <Lock size={14} /> SEGURANÇA MESTRE
                </h4>
                <div className="space-y-4">
                  <input 
                    type="password" 
                    className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white text-[11px] font-black outline-none focus:border-indigo-500 transition-all"
                    placeholder="Nova Senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input 
                    type="password" 
                    className="w-full px-5 py-4 rounded-xl border border-white/5 bg-black/40 text-white text-[11px] font-black outline-none focus:border-indigo-500 transition-all"
                    placeholder="Confirmar Nova Senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase hover:bg-slate-700 transition-all">
                    REDEFINIR CREDENCIAIS
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-10">
              <div className="p-10 bg-black/20 rounded-[2.5rem] border border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg uppercase tracking-tight leading-none">BACKUP DE DADOS</h4>
                    <p className="text-[9px] font-black text-slate-500 uppercase mt-1 tracking-widest">Sincronização e redundância</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-bold uppercase tracking-wide">
                  Seus dados estão sincronizados em tempo real. Para maior segurança, realize backups manuais periodicamente.
                </p>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={onExport}
                    className="w-full flex items-center justify-center gap-3 bg-white/5 text-slate-300 font-black py-4 rounded-xl border border-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all text-[10px] uppercase tracking-widest"
                  >
                    <Download size={18} /> EXPORTAR DATASET (.JSON)
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
                    className="w-full flex items-center justify-center gap-3 bg-white/5 text-slate-300 font-black py-4 rounded-xl border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-[10px] uppercase tracking-widest"
                  >
                    <Upload size={18} /> RESTAURAR DATASET
                  </button>
                </div>
              </div>

              {user.role !== 'administrator' ? (
                <div className="flex flex-col items-center gap-4 pt-6">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">ZONA DE RISCO CRÍTICO</p>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-rose-500/60 font-black text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={16} /> EXCLUIR CONTA DEFINITIVAMENTE
                  </button>
                </div>
              ) : (
                <div className="pt-6 text-center">
                   <div className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-500/5 rounded-xl border border-indigo-500/20 text-indigo-400 font-black text-[9px] uppercase tracking-[0.3em]">
                     <ShieldCheck size={14} /> CONTA PROTEGIDA PELO SISTEMA
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-12 text-center border border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/20">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">AÇÃO IRREVERSÍVEL</h3>
            <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10 uppercase tracking-wide">
              Tem certeza que deseja apagar todos os seus registros de combate? Esta ação destruirá permanentemente seu progresso.
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={onDelete} className="w-full bg-rose-600 text-white font-black py-5 rounded-xl text-[10px] tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/20">CONFIRMAR EXCLUSÃO</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full text-slate-500 font-black text-[10px] tracking-widest uppercase py-4">VOLTAR PARA SEGURANÇA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
