/**
 * Credenciales públicas del proyecto (anon key + URL son seguras con RLS).
 * Vercel puede sobreescribir con SUPABASE_URL y SUPABASE_ANON_KEY en Environment Variables.
 */
export const SUPABASE_URL = 'https://kiatnwjnvuutrwfivlzx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYXRud2pudnV1dHJ3Zml2bHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Mjc5NjQsImV4cCI6MjA5NzMwMzk2NH0.erVoFAJILIoZF_wW3FOPqssPA6Pd1WecfcIGv6PR3GM';

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL
    && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
