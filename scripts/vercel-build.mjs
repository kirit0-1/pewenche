/**
 * Build Vercel: config Supabase + bundle del cliente.
 * Prioridad: env vars → supabase-config.example.js
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadExampleDefaults() {
  const examplePath = join(root, 'js', 'supabase-config.example.js');
  if (!existsSync(examplePath)) return { url: '', key: '' };
  const raw = readFileSync(examplePath, 'utf8');
  const urlMatch = raw.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
  const keyMatch = raw.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
  return {
    url: urlMatch?.[1] || '',
    key: keyMatch?.[1] || '',
  };
}

const defaults = loadExampleDefaults();
const url = process.env.SUPABASE_URL || defaults.url;
const key = process.env.SUPABASE_ANON_KEY || defaults.key;

const configured = url && key && !url.includes('TU-PROYECTO') && key.length > 20;

if (!configured) {
  console.warn('⚠ Supabase sin configurar — el sitio funcionará solo en modo local');
}

const configContent = `/** Generado en build — no editar */
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

writeFileSync(join(root, 'js', 'supabase-config.js'), configContent, 'utf8');
console.log(configured ? '✓ supabase-config.js (Supabase activo)' : '⚠ supabase-config.js vacío');

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
