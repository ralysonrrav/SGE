
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const vars = {
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  };

  res.json({
    message: "Diagnóstico de Variáveis de Ambiente",
    status: vars.SMTP_USER && vars.SMTP_PASS ? "PRONTO PARA ENVIO" : "CONFIGURAÇÃO PENDENTE",
    found_variables: vars,
    instruction: "Se as variáveis aparecerem como 'false', verifique se as caixas 'Production' estão marcadas nas configurações da Vercel e faça um novo Redeploy sem cache."
  });
}
