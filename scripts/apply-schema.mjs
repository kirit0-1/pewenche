/**
 * Aplica schema.sql en Supabase (requiere contraseña de base de datos).
 * Uso: SUPABASE_DB_PASSWORD=tu_password node scripts/apply-schema.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'kiatnwjnvuutrwfivlzx';
const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_URL;

if (!password) {
  console.error('Falta SUPABASE_DB_PASSWORD (Settings → Database → Database password)');
  console.error('O pega supabase/schema.sql en el SQL Editor del dashboard.');
  process.exit(1);
}

const connectionString = password.startsWith('postgres')
  ? password
  : `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

const sql = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('✓ Schema aplicado en Supabase');
} catch (err) {
  if (err.message?.includes('ENOTFOUND') || err.code === 'ENOTFOUND') {
    console.error('No se pudo conectar al pooler. Usa el SQL Editor y pega supabase/schema.sql');
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
} finally {
  await client.end();
}
