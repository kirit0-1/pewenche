/**
 * Contacto público oficial — fuente prioritaria (HTML + este archivo).
 */
export const PUBLIC_CONTACT = {
  email: 'pewenchepropiedades@gmail.com',
  instagram: 'https://www.instagram.com/pewenchepropiedades/',
  instagramHandle: '@pewenchepropiedades',
};

export function resolvePublicContact(fallback = {}) {
  if (typeof document !== 'undefined') {
    const node = document.getElementById('public-contact-config');
    if (node?.textContent?.trim()) {
      try {
        return { ...fallback, ...PUBLIC_CONTACT, ...JSON.parse(node.textContent) };
      } catch {
        /* ignore */
      }
    }
  }
  return { ...fallback, ...PUBLIC_CONTACT };
}
