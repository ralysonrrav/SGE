
import { supabase } from '../lib/supabase';

/**
 * Serviço de Notificações
 * Atualmente simula o envio de e-mails e logs no console.
 * Para produção, deve ser integrado com Resend, SendGrid ou Supabase Edge Functions.
 */
export const notificationService = {
  /**
   * Envia notificação de aprovação de conta
   */
  async sendApprovalEmail(userEmail: string, userName: string) {
    console.log(`[Notification] Solicitando envio de e-mail de aprovação para ${userEmail}...`);
    
    try {
      const response = await fetch('/api/send-approval-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail, name: userName }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'SANDBOX_RESTRICTION') {
          console.warn(`[Notification] Restrição de Sandbox: ${result.error}`);
          return { success: false, error: 'SANDBOX_RESTRICTION', message: result.error };
        }
        throw new Error(result.error || 'Falha ao enviar e-mail');
      }

      if (result.simulated) {
        console.log(`[Notification] Simulação: E-mail para ${userEmail} registrado no servidor (API Key ausente).`);
      } else {
        console.log(`[Notification] E-mail enviado com sucesso para ${userEmail}`);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error(`[Notification] Erro ao enviar e-mail:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Envia notificação de bloqueio (opcional)
   */
  async sendBlockEmail(userEmail: string, userName: string) {
    console.log(`[Notification] Enviando e-mail de bloqueio para ${userEmail}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
};
