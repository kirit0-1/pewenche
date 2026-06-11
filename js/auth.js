/**
 * Autenticación — sesión local temporal.
 * REEMPLAZAR en producción con Supabase Auth (ver GUIA-BACKEND.md).
 */
import { ADMIN } from './config.js';

export class LocalAuthService {
  async login(username, password) {
    if (username === ADMIN.username && password === ADMIN.password) {
      const session = { at: Date.now(), user: username };
      sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify(session));
      return { ok: true };
    }
    return { ok: false, error: 'Credenciales incorrectas.' };
  }

  isAuthenticated() {
    try {
      const raw = sessionStorage.getItem(ADMIN.sessionKey);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (Date.now() - session.at > ADMIN.sessionTTL) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    sessionStorage.removeItem(ADMIN.sessionKey);
  }
}

/* ── Plantilla Supabase Auth ──
export class SupabaseAuthService {
  constructor(supabase) { this.supabase = supabase; }

  async login(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  }

  isAuthenticated() {
    return !!this.supabase.auth.getSession()?.data?.session;
  }

  async logout() {
    await this.supabase.auth.signOut();
  }
}
*/
