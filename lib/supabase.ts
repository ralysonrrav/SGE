
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://kubyooesnofaswpfexla.supabase.co';
const DEFAULT_KEY = 'sb_publishable_YIs9MLAF0rI3i7jDZBlllQ_SVrkY6N6';

// Detecção segura de ambiente
const getEnv = (key: string) => {
  try {
    return process.env[key] || process.env[`VITE_${key}`];
  } catch {
    return null;
  }
};

let supabaseUrl = getEnv('SUPABASE_URL') || DEFAULT_URL;
let supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || DEFAULT_KEY;

// Fallback se as strings vierem vazias do process.env
if (!supabaseUrl) supabaseUrl = DEFAULT_URL;
if (!supabaseAnonKey) supabaseAnonKey = DEFAULT_KEY;

const isValidUrl = (url: string) => url && url.startsWith('http');

export const supabase = isValidUrl(supabaseUrl) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: { 'x-application-name': 'studyflow' }
      }
    }) 
  : null;

if (!supabase) {
  console.warn("Supabase: Falha ao inicializar cliente. Verifique URL/Key.");
}
