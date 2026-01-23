
import { createClient } from '@supabase/supabase-js';

// Valores fornecidos pelo usuário como fallback
const DEFAULT_URL = 'https://kubyooesnofaswpfexla.supabase.co';
const DEFAULT_KEY = 'sb_publishable_YIs9MLAF0rI3i7jDZBlllQ_SVrkY6N6';

let supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL;
let supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Auto-correção para inversão de chaves comum em deploys
if (supabaseUrl.startsWith('sb_') && supabaseAnonKey.startsWith('http')) {
  const temp = supabaseUrl;
  supabaseUrl = supabaseAnonKey;
  supabaseAnonKey = temp;
}

const isValidUrl = (url: string) => url && url.startsWith('http');

export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }) 
  : null;

// Log de diagnóstico silencioso para desenvolvedor
if (!supabase) {
  console.error("Supabase: Falha na inicialização. Verifique as variáveis de ambiente.");
} else {
  console.debug("Supabase: Cliente configurado para", supabaseUrl.substring(0, 15) + "...");
}
