let _hasApi = null;
let _token = sessionStorage.getItem('pewenche_api_token') || '';

export function getToken() {
  return _token;
}

export function setToken(token) {
  _token = token || '';
  if (_token) sessionStorage.setItem('pewenche_api_token', _token);
  else sessionStorage.removeItem('pewenche_api_token');
}

export async function detectApi(force = false) {
  if (!force && _hasApi !== null) return _hasApi;
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    _hasApi = res.ok && data.backend === true;
  } catch {
    _hasApi = false;
  }
  return _hasApi;
}

export function hasApi() {
  return _hasApi === true;
}

export async function api(path, { method = 'GET', body, auth = false, formData } = {}) {
  const headers = {};
  if (auth && _token) headers.Authorization = `Bearer ${_token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export async function uploadImages(files) {
  const formData = new FormData();
  [...files].forEach(f => formData.append('images', f));
  return api('/api/upload', { method: 'POST', formData, auth: true });
}
