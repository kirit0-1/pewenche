/**
 * Genera js/supabase-config.js en el build de Vercel.
 * Variables en Vercel → Settings → Environment Variables
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const content = `/**
 * Generado en build — no editar en producción.
 */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL
    && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
`;

writeFileSync(join(root, 'js', 'supabase-config.js'), content, 'utf8');
console.log(url && key ? '✓ supabase-config.js generado' : '⚠ Sin variables SUPABASE_* (sitio en modo local)');
