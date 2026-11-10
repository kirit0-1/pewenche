/**
 * Configuración central — edita aquí contacto, branding y datos base.
 * Para producción: mueve credenciales admin a variables de entorno / Supabase Auth.
 */

import { PUBLIC_CONTACT } from './contact-public.js';

export const SITE = {
  name: 'Pewenche Propiedades',
  tagline: 'Propiedades en Chile',
  url: 'https://pewenche.cl',
  description: 'Propiedades en venta, arriendo, terrenos, hostales y campings en Chile.',
  year: 2026,
};

export const CONTACT = {
  whatsapp: '56982891650',
  whatsappDisplay: '+56 9 8289 1650',
  email: PUBLIC_CONTACT.email,
  instagram: PUBLIC_CONTACT.instagram,
  instagramHandle: PUBLIC_CONTACT.instagramHandle,
  facebook: 'https://facebook.com/pewenche',
  responseTime: 'menos de 24 horas',
};

export const TRUST = {
  propertiesCount: '50+',
  regionsCount: '16',
  experience: '5 años',
};

/** Sesión admin — contraseña solo en Supabase Auth o servidor Node (data/admin.json) */
export const ADMIN = {
  email: 'admin@pewenche.cl',
  sessionKey: 'pewenche_admin_session',
  sessionTTL: 8 * 60 * 60 * 1000,
};

export const STORAGE_KEY = 'pewenche_props';

/** Propiedades visibles por página en el listado público */
export const LIST_PAGE_SIZE = 6;

export const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
  'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago',
  "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía',
  'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

export const SECTION_MAP = {
  todas: [],
  arriendo: ['arriendo'],
  hostales: ['hostal', 'camping'],
};

export const BADGE = {
  venta:    { cls: 'bg-verde-800',  label: 'Venta' },
  arriendo: { cls: 'bg-blue-700',   label: 'Arriendo' },
  hostal:   { cls: 'bg-amber-600',  label: 'Hostal' },
  camping:  { cls: 'bg-teal-600',   label: 'Camping' },
  terreno:  { cls: 'bg-stone-600',  label: 'Terreno' },
};

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'title-asc', label: 'Nombre A–Z' },
];

export const DEFAULTS = [
  {
    id: 'p1', titulo: 'Casa 3D · 2B en Las Condes', tipo: 'venta',
    region: 'Metropolitana de Santiago', comuna: 'Las Condes',
    precioUF: 6200, precioCLP: '$243.000.000',
    superficie: 145, dorms: 3, banos: 2, estac: 2,
    desc: 'Luminosa casa de dos plantas en condominio cerrado con piscina y áreas verdes. Cocina equipada, living-comedor amplio y patio trasero con deck. A metros del metro Las Condes.',
    extras: ['Piscina', 'Jardín', 'Bodega', 'Portero', 'Gym'],
    imagenes: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    ],
  },
  {
    id: 'p2', titulo: 'Depto 2D · 1B en Providencia', tipo: 'arriendo',
    region: 'Metropolitana de Santiago', comuna: 'Providencia',
    precioUF: 28, precioCLP: '$1.098.000/mes',
    superficie: 58, dorms: 2, banos: 1, estac: 1,
    desc: 'Departamento moderno con vista despejada, piso 8, balcón y estacionamiento. A 5 minutos caminando del metro Salvador. Incluye bodega.',
    extras: ['Balcón', 'Bodega', 'Lavandería', 'Conserjería'],
    imagenes: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    ],
  },
  {
    id: 'p3', titulo: 'Terreno 5.000 m² en Villarrica', tipo: 'terreno',
    region: 'La Araucanía', comuna: 'Villarrica',
    precioUF: 1800, precioCLP: '$70.560.000',
    superficie: 5000, dorms: 0, banos: 0, estac: 0,
    desc: 'Hermoso terreno plano con vista al lago Villarrica y al volcán. Apto para construcción de cabaña, casa o lodge. Agua potable y electricidad en el límite.',
    extras: ['Vista al lago', 'Vista al volcán', 'Agua potable', 'Luz eléctrica'],
    imagenes: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    ],
  },
  {
    id: 'p4', titulo: 'Hostal Boutique · Cerro Alegre, Valparaíso', tipo: 'hostal',
    region: 'Valparaíso', comuna: 'Valparaíso',
    precioUF: 12, precioCLP: '$470.400/noche',
    superficie: 320, dorms: 8, banos: 6, estac: 0,
    desc: 'Casona patrimonial de 8 habitaciones en el Cerro Alegre. Terraza con vista panorámica al mar, cocina compartida equipada y ambiente bohemio auténtico.',
    extras: ['Vista al mar', 'Terraza', 'Cocina compartida', 'Patio', 'WiFi'],
    imagenes: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
      'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=800&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    ],
  },
  {
    id: 'p5', titulo: 'Camping Río Futaleufú · Patagonia', tipo: 'camping',
    region: 'Los Lagos', comuna: 'Futaleufú',
    precioUF: 3, precioCLP: '$117.600/noche',
    superficie: 15000, dorms: 0, banos: 4, estac: 20,
    desc: 'Camping privado a orillas del Río Futaleufú, ideal para kayak y rafting. 20 sitios con sombra, baños con agua caliente, cocina techada y wifi satelital.',
    extras: ['Orilla del río', 'Baños calientes', 'WiFi satelital', 'Zona BBQ', 'Arriendo equipos'],
    imagenes: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&q=80',
    ],
  },
  {
    id: 'p6', titulo: 'Casa 4D · Piscina en Vitacura', tipo: 'venta',
    region: 'Metropolitana de Santiago', comuna: 'Vitacura',
    precioUF: 18500, precioCLP: '$725.000.000',
    superficie: 350, dorms: 4, banos: 3, estac: 3,
    desc: 'Exclusiva casa en barrio privado de Vitacura. Doble altura en living, cocina gourmet, sala de cine, piscina temperada y dependencia de personal.',
    extras: ['Piscina temperada', 'Sala de cine', 'Cocina gourmet', 'Jardín 300m²', 'Alarma'],
    imagenes: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
    ],
  },
  {
    id: 'p7', titulo: 'Estudio 1D · Barrio Italia, Ñuñoa', tipo: 'arriendo',
    region: 'Metropolitana de Santiago', comuna: 'Ñuñoa',
    precioUF: 16, precioCLP: '$627.200/mes',
    superficie: 38, dorms: 1, banos: 1, estac: 0,
    desc: 'Estudio amplio y luminoso en pleno barrio Italia. Piso flotante, cocina americana integrada, calefacción y balcón. A 3 cuadras del metro Ñuñoa.',
    extras: ['Calefacción', 'Balcón', 'Lavadora', 'Amoblado parcial'],
    imagenes: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
      'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800&q=80',
    ],
  },
  {
    id: 'p8', titulo: 'Cabaña con Parcela 2há en Pucón', tipo: 'venta',
    region: 'La Araucanía', comuna: 'Pucón',
    precioUF: 4800, precioCLP: '$188.160.000',
    superficie: 120, dorms: 3, banos: 2, estac: 2,
    desc: 'Cabaña de madera nativa en parcela de 2 hectáreas con bosque de pinos y robles. Vista al volcán Villarrica, leñera, quincho techado y sendero propio al lago.',
    extras: ['Vista al volcán', 'Bosque nativo', 'Quincho', 'Sendero al lago', 'Leñera'],
    imagenes: [
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80',
      'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80',
      'https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?w=800&q=80',
    ],
  },
];

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80';

/** Coordenadas aproximadas por comuna (para mapas) */
export const COMUNA_COORDS = {
  'Las Condes': { lat: -33.4078, lng: -70.5672 },
  'Providencia': { lat: -33.4372, lng: -70.6506 },
  'Villarrica': { lat: -39.2857, lng: -72.2278 },
  'Valparaíso': { lat: -33.0472, lng: -71.6127 },
  'Futaleufú': { lat: -43.1842, lng: -71.8673 },
  'Vitacura': { lat: -33.3891, lng: -70.5698 },
  'Ñuñoa': { lat: -33.4569, lng: -70.5975 },
  'Pucón': { lat: -39.2820, lng: -71.9545 },
};

export function enrichProperty(p) {
  const coords = COMUNA_COORDS[p.comuna];
  let precioNota = p.precioNota || '';
  if (!precioNota && p.precioCLP) {
    const m = p.precioCLP.match(/(\/mes|\/noche)$/i);
    if (m) precioNota = m[1].toLowerCase();
  }
  if (!precioNota && String(p.tipo || '').toLowerCase() === 'arriendo') {
    precioNota = '/mes';
  }
  return {
    ...p,
    precioNota,
    lat: p.lat ?? coords?.lat,
    lng: p.lng ?? coords?.lng,
    descLarga: p.descLarga || [
      p.desc,
      p.extras?.length ? `Características destacadas: ${p.extras.join(', ')}.` : '',
      p.direccion ? `Ubicación: ${p.direccion}, ${p.comuna}.` : '',
    ].filter(Boolean).join('\n\n'),
  };
}
