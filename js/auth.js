/**
 * Autenticación — Supabase Auth (prod), API Node (dev) o bloqueado.
 */
import { ADMIN } from './config.js';
import { api, setToken, getToken } from './api.js';
import { getSupabase } from './supabase-client.js';
import { isLocalDev } from './env.js';

export class ApiAuthService {
  async login(username, password) {
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      setToken(data.token);
      sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({ at: Date.now(), user: data.user, mode: 'api' }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Credenciales incorrectas.' };
    }
  }

  isAuthenticated() {
    if (!getToken()) return false;
    try {
      const raw = sessionStorage.getItem(ADMIN.sessionKey);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (session.mode !== 'api') return false;
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
    setToken('');
    sessionStorage.removeItem(ADMIN.sessionKey);
  }
}

/** Sin contraseña en el bundle — solo mensaje en modo estático local */
export class LocalAuthService {
  async login() {
    return {
      ok: false,
      error: isLocalDev()
        ? 'Ejecuta npm.cmd start y usa las credenciales del servidor, o configura Supabase.'
        : 'El panel admin requiere Supabase Auth en producción.',
    };
  }

  isAuthenticated() {
    return false;
  }

  logout() {
    sessionStorage.removeItem(ADMIN.sessionKey);
  }
}

export class SupabaseAuthService {
  #valid = false;
  #unsub = null;

  normalizeEmail(user) {
    const u = user.trim();
    if (u.includes('@')) return u.toLowerCase();
    return `${u}@pewenche.cl`.toLowerCase();
  }

  async init() {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    this.#valid = !!data.session;
    if (data.session) {
      sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({
        at: Date.now(),
        user: data.session.user.email,
        mode: 'supabase',
      }));
    }
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      this.#valid = !!session;
      if (session) {
        sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({
          at: Date.now(),
          user: session.user.email,
          mode: 'supabase',
        }));
      } else {
        sessionStorage.removeItem(ADMIN.sessionKey);
      }
    });
    this.#unsub = sub?.subscription;
  }

  async login(user, password) {
    const sb = getSupabase();
    const email = this.normalizeEmail(user);
    if (email !== ADMIN.email.toLowerCase()) {
      return { ok: false, error: 'Usuario no autorizado.' };
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    this.#valid = true;
    sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({
      at: Date.now(),
      user: data.user?.email || email,
      mode: 'supabase',
    }));
    return { ok: true };
  }

  isAuthenticated() {
    return this.#valid;
  }

  async refreshSession() {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    this.#valid = !!data.session;
    if (!data.session) sessionStorage.removeItem(ADMIN.sessionKey);
    return this.#valid;
  }

  async logout() {
    const sb = getSupabase();
    await sb?.auth.signOut().catch(() => {});
    this.#valid = false;
    sessionStorage.removeItem(ADMIN.sessionKey);
    this.#unsub?.unsubscribe?.();
  }
}
