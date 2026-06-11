# Guía: Login seguro y propiedades en la nube (Supabase)

Esta guía explica cómo migrar Pewenche de `localStorage` + login en el navegador a un backend real y escalable con **Supabase** (gratis hasta cierto uso).

---

## Resumen de la arquitectura objetivo

```
Visitante → index.html → Supabase (lectura pública de propiedades)
Admin     → /#/admin  → Supabase Auth + CRUD protegido por RLS
```

| Capa actual | Archivo | Reemplazo en producción |
|-------------|---------|-------------------------|
| Datos | `js/storage.js` → `LocalPropertyStore` | `SupabasePropertyStore` |
| Login | `js/auth.js` → `LocalAuthService` | `SupabaseAuthService` |
| Config | `js/config.js` | Variables de entorno (sin contraseñas en código) |

---

## Paso 1 — Crear proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta.
2. **New project** → elige nombre `pewenche`, región cercana (ej. `South America`).
3. Guarda la **Database password** en un lugar seguro.
4. En **Project Settings → API**, copia:
   - `Project URL`
   - `anon public` key (para el frontend)
   - `service_role` key (solo backend/scripts, nunca en el frontend)

---

## Paso 2 — Crear tabla `properties`

En **SQL Editor**, ejecuta:

```sql
create table public.properties (
  id          text primary key,
  titulo      text not null,
  tipo        text not null check (tipo in ('venta','arriendo','hostal','camping','terreno')),
  region      text not null,
  comuna      text not null,
  precio_uf   numeric default 0,
  precio_clp  text default '',
  superficie  integer default 0,
  dorms       integer default 0,
  banos       integer default 0,
  estac       integer default 0,
  desc        text default '',
  imagenes    jsonb default '[]',
  extras      jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger properties_updated_at
  before update on public.properties
  for each row execute function update_updated_at();
```

---

## Paso 3 — Políticas de seguridad (RLS)

Activa Row Level Security:

```sql
alter table public.properties enable row level security;

-- Cualquiera puede LEER propiedades (sitio público)
create policy "Propiedades públicas"
  on public.properties for select
  using (true);

-- Solo usuarios autenticados pueden INSERT/UPDATE/DELETE
create policy "Admin insert"
  on public.properties for insert
  to authenticated
  with check (true);

create policy "Admin update"
  on public.properties for update
  to authenticated
  using (true);

create policy "Admin delete"
  on public.properties for delete
  to authenticated
  using (true);
```

---

## Paso 4 — Crear usuario administrador

1. En Supabase → **Authentication → Users → Add user**.
2. Email: `admin@pewenche.cl` (o el que prefieras).
3. Contraseña segura (mín. 12 caracteres, mayúsculas, números).
4. Confirma el email si está activada la verificación.

> Ya no uses `admin` / `pehuenche2026` del archivo `config.js`.

---

## Paso 5 — Instalar Supabase en el proyecto

En la carpeta del proyecto:

```bash
npm init -y
npm install @supabase/supabase-js
```

Crea `js/supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

> En producción usa variables de entorno con Vite/Astro: `import.meta.env.VITE_SUPABASE_URL`

---

## Paso 6 — Reemplazar `LocalPropertyStore`

En `js/storage.js`, descomenta y adapta `SupabasePropertyStore`:

```javascript
import { supabase } from './supabase-client.js';

function rowToProp(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    tipo: row.tipo,
    region: row.region,
    comuna: row.comuna,
    precioUF: Number(row.precio_uf),
    precioCLP: row.precio_clp,
    superficie: row.superficie,
    dorms: row.dorms,
    banos: row.banos,
    estac: row.estac,
    desc: row.desc,
    imagenes: row.imagenes || [],
    extras: row.extras || [],
  };
}

function propToRow(p) {
  return {
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo,
    region: p.region,
    comuna: p.comuna,
    precio_uf: p.precioUF,
    precio_clp: p.precioCLP,
    superficie: p.superficie,
    dorms: p.dorms,
    banos: p.banos,
    estac: p.estac,
    desc: p.desc,
    imagenes: p.imagenes,
    extras: p.extras,
  };
}

export class SupabasePropertyStore {
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToProp);
  }

  async saveAll() {
    throw new Error('Usa upsert/remove individualmente');
  }

  async upsert(_properties, property) {
    const { error } = await supabase
      .from('properties')
      .upsert(propToRow(property));
    if (error) throw error;
    return this.getAll();
  }

  async remove(_properties, id) {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    return this.getAll();
  }
}
```

En `js/main.js`, cambia:

```javascript
// const store = new LocalPropertyStore();
import { SupabasePropertyStore } from './storage.js';
const store = new SupabasePropertyStore();
```

---

## Paso 7 — Reemplazar login local

En `js/auth.js`, implementa `SupabaseAuthService`:

```javascript
import { supabase } from './supabase-client.js';

export class SupabaseAuthService {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, user: data.user };
  }

  isAuthenticated() {
    return !!supabase.auth.getSession()?.data?.session;
  }

  async logout() {
    await supabase.auth.signOut();
  }
}
```

En `js/main.js`:

```javascript
import { SupabaseAuthService } from './auth.js';
const auth = new SupabaseAuthService();
```

En el modal de login, cambia el campo **Usuario** por **Email** (`type="email"`).

---

## Paso 8 — Migrar datos existentes

Opción A — manual: copia cada propiedad desde el panel admin y vuelve a guardar (ya irán a Supabase).

Opción B — script de migración (consola del navegador con localStorage):

```javascript
const props = JSON.parse(localStorage.getItem('pewenche_props') || '[]');
for (const p of props) {
  await supabase.from('properties').upsert({
    id: p.id, titulo: p.titulo, tipo: p.tipo,
    region: p.region, comuna: p.comuna,
    precio_uf: p.precioUF, precio_clp: p.precioCLP,
    superficie: p.superficie, dorms: p.dorms, banos: p.banos, estac: p.estac,
    desc: p.desc, imagenes: p.imagenes, extras: p.extras,
  });
}
```

---

## Paso 9 — Subir imágenes (recomendado)

Las URLs externas funcionan, pero para escalar:

1. Supabase → **Storage** → crea bucket `property-images` (público).
2. Sube fotos desde el panel o con:

```javascript
const file = input.files[0];
const path = `${propertyId}/${Date.now()}-${file.name}`;
await supabase.storage.from('property-images').upload(path, file);
const { data } = supabase.storage.from('property-images').getPublicUrl(path);
// data.publicUrl → guardar en property.imagenes
```

---

## Paso 10 — Desplegar el sitio

Opciones gratuitas y simples:

| Servicio | Comando / acción |
|----------|------------------|
| **Netlify** | Arrastra la carpeta o conecta GitHub |
| **Vercel** | `vercel --prod` |
| **GitHub Pages** | Publica rama `gh-pages` |

> Los módulos ES (`type="module"`) requieren servir por HTTP. Netlify/Vercel lo hacen automáticamente.

Configura tu dominio `pewenche.cl` en el panel del hosting.

---

## Paso 11 — Checklist de seguridad antes de producción

- [ ] Eliminar `ADMIN.password` de `js/config.js`
- [ ] Quitar `LocalAuthService` y `LocalPropertyStore` del build de producción
- [ ] Verificar RLS activo en Supabase
- [ ] Usar contraseña fuerte en Supabase Auth
- [ ] No exponer `service_role` key en el frontend
- [ ] HTTPS activo en el dominio
- [ ] Acceso admin solo por `tu-dominio.cl/#/admin`

---

## Cómo usar el sitio ahora (antes de Supabase)

| Acción | Cómo |
|--------|------|
| Ver propiedades | Abre `index.html` con Live Server (extensión VS Code) o cualquier servidor estático |
| Panel admin | Ve a `http://localhost:5500/#/admin` |
| Login demo | Usuario: `admin` / Contraseña: `pehuenche2026` |
| Editar contacto | Archivo `js/config.js` → objeto `CONTACT` |
| Agregar propiedad | Admin → Agregar propiedad → Guardar (se guarda en localStorage del navegador) |

---

## Próximos pasos opcionales

1. **Vite** — build optimizado de Tailwind (elimina CDN).
2. **Paginación** — `.range(0, 11)` en Supabase para listados grandes.
3. **Email de contacto** — Supabase Edge Function + Resend/SendGrid.
4. **Analytics** — Plausible o Google Analytics 4.

---

¿Necesitas ayuda implementando Supabase directamente en el código? Indica si ya creaste el proyecto y te preparo los archivos listos para pegar tus credenciales.
