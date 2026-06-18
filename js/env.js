/** Entorno: producción vs desarrollo local */
export function isLocalDev() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '';
}

export function getBackendLabel(mode) {
  return { supabase: 'Supabase (nube)', api: 'Servidor Node', local: 'Solo este navegador' }[mode] || mode;
}
