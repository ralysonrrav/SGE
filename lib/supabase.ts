
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://kubyooesnofaswpfexla.supabase.co';
const DEFAULT_KEY = 'sb_publishable_YIs9MLAF0rI3i7jDZBlllQ_SVrkY6N6';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: window.localStorage,
        storageKey: 'sb-studyflow-auth'
      },
      global: {
        headers: { 'x-application-name': 'studyflow' }
      }
    }) 
  : null;

/**
 * Utilitário sênior para verificar erros de rede.
 * Captura especificamente 'Failed to fetch' que ocorre em sandboxes ou bloqueios de rede.
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message?.toLowerCase() || "";
  const name = error.name || "";
  const code = error.code || "";
  
  return (
    name === 'TypeError' || 
    message.includes('fetch') || 
    message.includes('network') || 
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('failed to connect') ||
    code === 'PGRST301' || 
    !navigator.onLine
  );
};
