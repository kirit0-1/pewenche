/**
 * Credenciales públicas del proyecto (anon/publishable key + URL son seguras con RLS).
 * Vercel puede sobreescribir con SUPABASE_URL y SUPABASE_ANON_KEY en Environment Variables.
 */
export const SUPABASE_URL = 'https://twckfzdlwgaydvddeker.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_yB7CgzB3cOhmEbcWYlgyXg_LFUn9-KK';

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL
    && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
