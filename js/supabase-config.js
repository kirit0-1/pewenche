/**
 * Pega aquí tus credenciales de Supabase → Project Settings → API
 * La anon key es segura para el frontend.
 */
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL
    && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
