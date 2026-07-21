/**
 * Genera carpeta dist-hosting/ lista para subir a DonHost (public_html).
 * Uso: npm run pack:donhost
 */
import { execSync } from 'child_process';
import {
  cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'dist-hosting');

const COPY = [
  'index.html',
  'propiedad.html',
  '.htaccess',
  'css',
  'js',
  'img',
  'uploads',
];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) copyDir(from, to);
    else cpSync(from, to);
  }
}

console.log('→ npm run build');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

if (!existsSync(join(root, 'js', 'supabase-config.js'))) {
  console.error('Falta js/supabase-config.js — revisa supabase-config.example.js');
  process.exit(1);
}
if (!existsSync(join(root, 'js', 'vendor', 'supabase.js'))) {
  console.error('Falta js/vendor/supabase.js — el build falló');
  process.exit(1);
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const item of COPY) {
  const src = join(root, item);
  if (!existsSync(src)) continue;
  const dest = join(out, item);
  if (statSync(src).isDirectory()) copyDir(src, dest);
  else cpSync(src, dest);
}

console.log('\n✓ Listo: dist-hosting/');
console.log('  Sube TODO el contenido de esa carpeta a public_html en DonHost.\n');
