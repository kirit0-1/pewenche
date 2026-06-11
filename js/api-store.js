import { enrichProperty } from './config.js';
import { api } from './api.js';

export class ApiPropertyStore {
  async getAll() {
    const list = await api('/api/properties');
    return list.map(enrichProperty);
  }

  async saveAll(properties) {
    for (const p of properties) {
      await api('/api/properties', { method: 'POST', body: p, auth: true });
    }
    return this.getAll();
  }

  async upsert(_properties, property) {
    await api('/api/properties', { method: 'POST', body: property, auth: true });
    return this.getAll();
  }

  async remove(_properties, id) {
    return api(`/api/properties/${id}`, { method: 'DELETE', auth: true });
  }
}
