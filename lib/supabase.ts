
import { createClient } from '@supabase/supabase-js';

// Valores fornecidos pelo usuário
const DEFAULT_URL = 'https://kubyooesnofaswpfexla.supabase.co';
const DEFAULT_KEY = 'sb_publishable_YIs9MLAF0rI3i7jDZBlllQ_SVrkY6N6';

// Busca das variáveis de ambiente com fallback para os valores fixos
let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL;
let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

/**
 * Lógica de auto-correção:
 * Se o usuário inverteu os valores no painel da Vercel (colocou a Key na variável da URL),
 * nós detectamos e trocamos para garantir que o app não quebre.
 */
if (supabaseUrl && supabaseUrl.startsWith('sb_') && supabaseAnonKey && supabaseAnonKey.startsWith('http')) {
  console.log("Supabase (LOG): Detectada inversão de chaves. Corrigindo automaticamente...");
  const temp = supabaseUrl;
  supabaseUrl = supabaseAnonKey;
  supabaseAnonKey = temp;
}

// Validação final antes de criar o cliente
const isValidUrl = (url: string) => url && url.startsWith('http');

export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: { 'x-application-name': 'studyflow' }
      }
    }) 
  : null;

if (!supabase) {
  console.error("ERRO CRÍTICO: Não foi possível inicializar o cliente Supabase. Verifique a URL:", supabaseUrl);
} else {
  console.log("Supabase (LOG): Cliente autenticado com sucesso em", supabaseUrl);
}
