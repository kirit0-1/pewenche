/**
 * Build Vercel: config Supabase + bundle del cliente.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const isVercel = process.env.VERCEL === '1';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (isVercel && (!url || !key)) {
  console.error('ERROR: Define SUPABASE_URL y SUPABASE_ANON_KEY en Vercel → Environment Variables');
  process.exit(1);
}

const configContent = `/** Generado en build */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL && SUPABASE_ANON_KEY
    && !SUPABASE_URL.includes('TU-PROYECTO')
    && SUPABASE_ANON_KEY.length > 20
  );
}
`;

if (!isVercel && !url && !key) {
  console.log('⚠ Sin SUPABASE_* en env — se mantiene js/supabase-config.js local si existe');
} else {
  writeFileSync(join(root, 'js', 'supabase-config.js'), configContent, 'utf8');
  console.log(url && key ? '✓ supabase-config.js' : '⚠ supabase-config.js vacío');
}

mkdirSync(join(root, 'js', 'vendor'), { recursive: true });
await esbuild.build({
  entryPoints: [join(root, 'js', 'supabase-vendor.js')],
  outfile: join(root, 'js', 'vendor', 'supabase.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
});
console.log('✓ js/vendor/supabase.js empaquetado');
