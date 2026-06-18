/**
 * Copia supabase-config.example.js si falta el config local.
 */
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'js', 'supabase-config.js');
const example = join(root, 'js', 'supabase-config.example.js');

if (!existsSync(target) && existsSync(example)) {
  copyFileSync(example, target);
  console.log('✓ Creado js/supabase-config.js desde example (edita tus credenciales)');
}

mkdirSync(join(root, 'js', 'vendor'), { recursive: true });
