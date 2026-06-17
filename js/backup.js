import { getSupabase } from './supabase-client.js';

export async function createCloudBackup(label = 'manual') {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');

  const [{ data: properties }, { data: leads }] = await Promise.all([
    sb.from('properties').select('*'),
    sb.from('leads').select('*'),
  ]);

  const payload = {
    properties: properties || [],
    leads: leads || [],
    exported_at: new Date().toISOString(),
  };

  const { error } = await sb.from('backups').insert({
    label: `${label} · ${new Date().toLocaleString('es-CL')}`,
    data: payload,
  });
  if (error) throw error;
  return payload;
}

export async function listBackups() {
  const sb = getSupabase();
  const { data, error } = await sb.from('backups').select('id, label, created_at').order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data || [];
}
