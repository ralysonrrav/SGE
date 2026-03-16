
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Configuração de E-mail ---

  // 1. Configuração Nodemailer (Gmail/SMTP) - Recomendado para quem não tem domínio
  const getNodemailerTransporter = () => {
    const user = process.env.SMTP_USER; // Seu e-mail do Gmail
    const pass = process.env.SMTP_PASS; // Sua "Senha de App" do Gmail
    
    if (!user || !pass) return null;

    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  };

  // 2. Configuração Resend (Requer domínio próprio)
  let resend: Resend | null = null;
  const getResend = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    if (!resend) resend = new Resend(apiKey);
    return resend;
  };

  // API Routes
  app.post("/api/send-approval-email", async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "E-mail e nome são obrigatórios" });
    }

    // Tentar Nodemailer primeiro (mais flexível para domínios gratuitos)
    const transporter = getNodemailerTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Kronos" <${process.env.SMTP_USER}>`,
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
        console.log(`[Nodemailer] E-mail enviado para ${email}`);
        return res.json({ success: true, method: 'nodemailer' });
      } catch (err: any) {
        console.error("[Nodemailer] Erro ao enviar:", err);
        // Se falhar o nodemailer, tenta o Resend abaixo
      }
    }

    // Tentar Resend como segunda opção
    const resendClient = getResend();
    if (!resendClient) {
      console.log(`[Simulação] E-mail de aprovação para ${email} (Nenhuma credencial de e-mail configurada)`);
      return res.json({ success: true, simulated: true });
    }

    try {
      const { data, error } = await resendClient.emails.send({
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
            error: "Restrição do Resend Sandbox. Use o Nodemailer/Gmail para enviar para qualquer e-mail sem ter um domínio.",
            code: 'SANDBOX_RESTRICTION'
          });
        }
        return res.status(500).json({ error: error.message });
      }

      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
