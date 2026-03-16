
import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "E-mail e nome são obrigatórios" });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendKey = process.env.RESEND_API_KEY;

  console.log(`[Vercel API] Tentando enviar e-mail para ${email}. Configurações encontradas: SMTP_USER=${!!smtpUser}, SMTP_PASS=${!!smtpPass}, RESEND_API_KEY=${!!resendKey}`);

  // 1. Tentar Nodemailer (Gmail)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: `"Kronos" <${smtpUser}>`,
        to: email,
        subject: "Sua conta no KRONOS foi aprovada!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h1 style="color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em;">Acesso Liberado!</h1>
            <p>Olá <strong>${name}</strong>,</p>
            <p>Temos o prazer de informar que sua conta na plataforma <strong>KRONOS</strong> foi aprovada pelo administrador.</p>
            <p>Agora você já pode acessar todas as funcionalidades estratégicas para seus estudos.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              Equipe Kronos - Plataforma Estratégica
            </div>
          </div>
        `,
      });
      console.log(`[Vercel API] E-mail enviado via Nodemailer para ${email}`);
      return res.status(200).json({ success: true, method: 'nodemailer' });
    } catch (err: any) {
      console.error("[Vercel API] Erro Nodemailer:", err);
      // Se falhar e não tiver Resend, retorna o erro aqui
      if (!resendKey) {
        return res.status(500).json({ error: `Erro no Gmail: ${err.message}` });
      }
    }
  }

  // 2. Tentar Resend (como fallback)
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: "Kronos <onboarding@resend.dev>",
        to: [email],
        subject: "Sua conta no KRONOS foi aprovada!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h1 style="color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em;">Acesso Liberado!</h1>
            <p>Olá <strong>${name}</strong>,</p>
            <p>Temos o prazer de informar que sua conta na plataforma <strong>KRONOS</strong> foi aprovada pelo administrador.</p>
            <p>Agora você já pode acessar todas as funcionalidades estratégicas para seus estudos.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              Equipe Kronos - Plataforma Estratégica
            </div>
          </div>
        `,
      });

      if (error) {
        if (error.name === 'validation_error' && error.message.includes('testing emails')) {
          return res.status(403).json({ 
            error: "Restrição do Resend Sandbox. Use o Nodemailer/Gmail para enviar para qualquer e-mail.",
            code: 'SANDBOX_RESTRICTION'
          });
        }
        return res.status(500).json({ error: `Erro no Resend: ${error.message}` });
      }

      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: `Erro fatal no Resend: ${err.message}` });
    }
  }

  // Se chegou aqui, nada foi configurado
  const missing = [];
  if (!smtpUser) missing.push('SMTP_USER');
  if (!smtpPass) missing.push('SMTP_PASS');
  if (!resendKey) missing.push('RESEND_API_KEY');

  return res.status(500).json({ 
    error: `Configuração incompleta. Variáveis ausentes na Vercel: ${missing.join(', ')}. Certifique-se de fazer um novo Deploy após adicionar as variáveis.` 
  });
}
