/**
 * Autenticación — Supabase Auth, API Node o local.
 */
import { ADMIN } from './config.js';
import { api, setToken, getToken } from './api.js';
import { getSupabase } from './supabase-client.js';

export class ApiAuthService {
  async login(username, password) {
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      setToken(data.token);
      sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({ at: Date.now(), user: data.user }));
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

export class LocalAuthService {
  async login(username, password) {
    if (username === ADMIN.username && password === ADMIN.password) {
      sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({ at: Date.now(), user: username }));
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

export class SupabaseAuthService {
  normalizeEmail(user) {
    const u = user.trim();
    return u.includes('@') ? u : `${u}@pewenche.cl`;
  }

  async login(user, password) {
    const sb = getSupabase();
    const email = this.normalizeEmail(user);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    sessionStorage.setItem(ADMIN.sessionKey, JSON.stringify({
      at: Date.now(),
      user: data.user?.email || email,
      mode: 'supabase',
    }));
    return { ok: true };
  }

  isAuthenticated() {
    try {
      const raw = sessionStorage.getItem(ADMIN.sessionKey);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (session.mode !== 'supabase') return false;
      if (Date.now() - session.at > ADMIN.sessionTTL) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async logout() {
    const sb = getSupabase();
    await sb?.auth.signOut().catch(() => {});
    sessionStorage.removeItem(ADMIN.sessionKey);
  }
}
