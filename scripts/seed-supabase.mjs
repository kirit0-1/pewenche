/**
 * Pobla Supabase con las propiedades demo.
 * Uso: npm run seed:supabase
 * Con RLS estricto: SUPABASE_SERVICE_ROLE_KEY=... npm run seed:supabase
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadConfig() {
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (url && (serviceKey || anonKey)) {
    return { url, key: serviceKey || anonKey, usingService: Boolean(serviceKey) };
  }
  try {
    const raw = readFileSync(join(root, 'js/supabase-config.js'), 'utf8');
    const urlMatch = raw.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = raw.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
    return {
      url: urlMatch?.[1] || '',
      key: serviceKey || keyMatch?.[1] || '',
      usingService: Boolean(serviceKey),
    };
  } catch {
    return { url: '', key: '', usingService: false };
  }
}

function propToRow(p) {
  return {
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo,
    region: p.region || '',
    comuna: p.comuna || '',
    direccion: p.direccion || '',
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    precio_uf: p.precioUF || 0,
    precio_nota: p.precioNota || '',
    precio_clp: p.precioCLP || '',
    superficie: p.superficie || 0,
    dorms: p.dorms || 0,
    banos: p.banos || 0,
    estac: p.estac || 0,
    desc: p.desc || '',
    desc_larga: p.descLarga || p.desc || '',
    imagenes: p.imagenes || [],
    extras: p.extras || [],
  };
}

const { url, key, usingService } = loadConfig();
if (!url || !key || url.includes('TU-PROYECTO')) {
  console.error('Configura SUPABASE_URL y SUPABASE_ANON_KEY (o SERVICE_ROLE_KEY para seed con RLS)');
  process.exit(1);
}

const { DEFAULTS } = await import(pathToFileURL(join(root, 'js/config.js')).href);
const sb = createClient(url, key);
const rows = DEFAULTS.map(propToRow);

const { error } = await sb.from('properties').upsert(rows);
if (error) {
  console.error('Error:', error.message);
  if (!usingService && error.message?.includes('policy')) {
    console.error('Tip: usa SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role / secret)');
  }
  process.exit(1);
}

const { error: backupErr } = await sb.from('backups').insert({
  label: `seed inicial · ${new Date().toLocaleString('es-CL')}`,
  data: { properties: rows, leads: [], exported_at: new Date().toISOString() },
});
if (backupErr && !backupErr.message?.includes('policy')) {
  console.warn('Aviso respaldo:', backupErr.message);
}

console.log(`✓ ${rows.length} propiedades subidas a Supabase`);
