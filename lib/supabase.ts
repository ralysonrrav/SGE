
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https://kubyooesnofaswpfexla.supabase.co || '';
const supabaseAnonKey = process.env.sb_publishable_YIs9MLAF0rI3i7jDZBlllQ_SVrkY6N6 || '';

// Exportamos o cliente apenas se as credenciais estiverem presentes.
// Caso contrário, exportamos null e tratamos defensivamente no App.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.error("ERRO DE CONFIGURAÇÃO: As variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY não foram encontradas. A sincronização com o banco de dados está desativada.");
}
