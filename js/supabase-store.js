import { enrichProperty } from './config.js';
import { getSupabase } from './supabase-client.js';

function rowToProp(row) {
  if (!row) return null;
  return enrichProperty({
    id: row.id,
    titulo: row.titulo,
    tipo: row.tipo,
    region: row.region,
    comuna: row.comuna,
    direccion: row.direccion || '',
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    precioUF: Number(row.precio_uf) || 0,
    precioNota: row.precio_nota || '',
    precioCLP: row.precio_clp || '',
    superficie: row.superficie || 0,
    dorms: row.dorms || 0,
    banos: row.banos || 0,
    estac: row.estac || 0,
    desc: row.desc || '',
    descLarga: row.desc_larga || '',
    imagenes: row.imagenes || [],
    extras: row.extras || [],
  });
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
    desc_larga: p.descLarga || '',
    imagenes: p.imagenes || [],
    extras: p.extras || [],
  };
}

export class SupabasePropertyStore {
  async getAll() {
    const sb = getSupabase();
    const { data, error } = await sb.from('properties').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToProp);
  }

  async upsert(_properties, property) {
    const sb = getSupabase();
    const row = propToRow(property);
    const { error } = await sb.from('properties').upsert(row);
    if (error) throw error;
    return this.getAll();
  }

  async remove(_properties, id) {
    const sb = getSupabase();
    const { error } = await sb.from('properties').delete().eq('id', id);
    if (error) throw error;
    return this.getAll();
  }
}

export async function uploadPropertyImage(file) {
  if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
    throw new Error('Solo imágenes JPG, PNG, WEBP o GIF');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Imagen demasiado grande (máx 8 MB)');
  }
  const sb = getSupabase();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('property-images').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = sb.storage.from('property-images').getPublicUrl(path);
  return data.publicUrl;
}
