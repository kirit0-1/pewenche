# Pewenche Propiedades

Sitio inmobiliario Chile — Vercel + Supabase.

## Contacto público

| Canal | Valor |
|-------|--------|
| Correo | pewenchepropiedades@gmail.com |
| Instagram | [@pewenchepropiedades](https://www.instagram.com/pewenchepropiedades/) |
| WhatsApp | +56 9 8289 1650 |

Editar en `js/config.js` → `CONTACT`. Ver **MAINTENANCE.md** para rutinas de mantenimiento.

## Seguridad

- Admin en producción: **Supabase Auth** (`admin@pewenche.cl`) — sin contraseña en el código JS.
- Ejecuta `supabase/schema-v2-rls.sql` para RLS restringido al admin.
- **Deshabilita sign-ups** en Supabase → Authentication → Providers → Email.
- Formulario con honeypot anti-bots, validación de email y rate limit (60 s).
- Headers CSP en Vercel (`vercel.json`).

## Desarrollo local

```powershell
cd C:\Users\josue\Desktop\ded
copy js\supabase-config.example.js js\supabase-config.js
# Edita js\supabase-config.js con tu URL y anon key
npm.cmd install
npm.cmd run build
npm.cmd start
```

Abre `http://localhost:3000` — Admin en pie de página.

## Producción (Vercel + Supabase)

### 1. Supabase

1. Ejecuta `supabase/schema.sql` en SQL Editor (proyecto nuevo).
2. Si ya tenías schema antiguo, ejecuta también `supabase/schema-v2-rls.sql`.
3. **Authentication → Users → Add user:**
   - Email: `admin@pewenche.cl`
   - Password: `prueba12345` (o la que elijas)
4. Storage: bucket `property-images` (público) — el schema lo crea.
5. Seed de propiedades demo:
   ```powershell
   npm.cmd run seed:supabase
   ```
   Si falla por RLS, usa clave **service role** (solo en tu PC, nunca en Vercel):
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
   npm.cmd run seed:supabase
   ```

### 2. Vercel

Variables de entorno (**obligatorias**):

| Variable | Valor |
|----------|--------|
| `SUPABASE_URL` | `https://kiatnwjnvuutrwfivlzx.supabase.co` |
| `SUPABASE_ANON_KEY` | clave anon `eyJ...` |

Build: `npm run build` → carpeta `public/` (automático en Vercel). **Redeploy** después de cambiar variables.

**Vercel → Settings → Build:** Framework **Other**, Build Command `npm run build`, Output Directory `public`.

### 3. Dominio nic.cl → DonHost

El sitio de producción va a **DonHost** (no Vercel). En [nic.cl](https://nic.cl) → tu dominio `pewenche.cl` → **Servidores de nombre autorizados**, deja **solo** estos:

```
ns1.donhost.cl
ns2.donhost.cl
ns3.donhost.cl
ns4.donhost.cl
```

Fuente oficial: [DNS DonHost](https://www.clientes.donhost.cl/index.php/knowledgebase/1/Cuales-don-los-dns-de-donhost.html).

1. Guarda en NIC Chile (propagación: minutos a 24–48 h).
2. En DonHost / cPanel → **Dominios** / **Addon** asegúrate de que `pewenche.cl` y `www` apunten a `public_html`.
3. Activa **SSL** (Let’s Encrypt) cuando el DNS ya resuelva a DonHost.
4. Sube el contenido de `dist-hosting/` (o `pewenche-donhost.zip`) a `public_html`.

Mientras tanto puedes usar: https://pewenche.vercel.app y https://kirit0-1.github.io/pewenche/

### 4. Verificar consultas (leads)

1. Abre el sitio en Vercel (no localhost).
2. Entra a una propiedad → envía formulario de consulta.
3. Supabase → Table Editor → `leads` → debe aparecer la fila.
4. Admin en Vercel → login `admin@pewenche.cl` / contraseña Supabase Auth.
5. Banner verde: **Datos en Supabase**.

## Flujo de datos

```
Visitante → Vercel (estático) → Supabase (leads, propiedades)
Admin     → Supabase Auth → lee/escribe con sesión autenticada
```

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run build` | Genera `public/` + bundle Supabase (Vercel) |
| `npm run seed:supabase` | Sube propiedades demo |
| `npm run schema:supabase` | Aplica schema (requiere DB password) |

## Seguridad

- **Nunca** subas `js/supabase-config.js` ni la clave **service role** a GitHub.
- La clave **anon** va solo en Vercel (es pública en el frontend).
- Admin en producción usa **Supabase Auth**, no la contraseña de `config.js`.
