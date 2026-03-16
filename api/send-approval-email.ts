
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

  // 1. Tentar Nodemailer (Gmail)
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

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
    }
  }

  // 2. Tentar Resend (como fallback)
  const resendKey = process.env.RESEND_API_KEY;
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
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(500).json({ error: "Nenhuma configuração de e-mail encontrada no servidor." });
}
