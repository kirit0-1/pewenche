/**
 * Build Vercel: config Supabase + bundle + carpeta public/ para deploy.
 * Prioridad: env vars → supabase-config.example.js
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

const STATIC_COPY = ['index.html', 'propiedad.html', 'css', 'js', 'uploads'];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) copyDir(from, to);
    else cpSync(from, to);
  }
}

function copyStaticToPublic() {
  if (existsSync(publicDir)) rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(publicDir, { recursive: true });

  let copied = 0;
  for (const item of STATIC_COPY) {
    const src = join(root, item);
    if (!existsSync(src)) continue;
    const dest = join(publicDir, item);
    if (statSync(src).isDirectory()) copyDir(src, dest);
    else cpSync(src, dest);
    copied += 1;
  }

  if (!existsSync(join(publicDir, 'index.html'))) {
    throw new Error('Build incompleto: falta public/index.html');
  }
  console.log(`✓ public/ listo (${copied} elementos)`);
}

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

function normalizeSupabaseUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const defaults = loadExampleDefaults();
const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || defaults.url);
const key = (process.env.SUPABASE_ANON_KEY || defaults.key || '').trim();

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

copyStaticToPublic();
