export const SUPABASE_URL = 'https://kiatnwjnvuutrwfivlzx.supabase.co';
export const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL
    && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
