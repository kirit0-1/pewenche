/**
 * Capa de persistencia — hoy usa localStorage.
 * Para producción: crea SupabasePropertyStore con la misma interfaz.
 */
import { DEFAULTS, STORAGE_KEY, enrichProperty } from './config.js';

export class LocalPropertyStore {
  async getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : structuredClone(DEFAULTS);
      return list.map(enrichProperty);
    } catch {
      return structuredClone(DEFAULTS).map(enrichProperty);
    }
  }

  async saveAll(properties) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
    window.dispatchEvent(new CustomEvent('pewenche-data-change', { detail: { key: STORAGE_KEY } }));
    return properties;
  }

  async upsert(properties, property) {
    const enriched = enrichProperty(property);
    const idx = properties.findIndex(p => p.id === enriched.id);
    if (idx >= 0) properties[idx] = enriched;
    else properties.push(enriched);
    await this.saveAll(properties);
    return properties;
  }

  async remove(properties, id) {
    const next = properties.filter(p => p.id !== id);
    await this.saveAll(next);
    return next;
  }
}

/* ── Plantilla para Supabase (implementar en producción) ──
export class SupabasePropertyStore {
  constructor(supabase) { this.supabase = supabase; }

  async getAll() {
    const { data, error } = await this.supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async saveAll() { throw new Error('Usa upsert/remove en Supabase'); }

  async upsert(properties, property) {
    const { error } = await this.supabase.from('properties').upsert(property);
    if (error) throw error;
    return this.getAll();
  }

  async remove(properties, id) {
    const { error } = await this.supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    return this.getAll();
  }
}
*/
