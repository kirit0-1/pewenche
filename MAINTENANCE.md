# Mantenimiento — Pewenche Propiedades

Checklist para rutinas periódicas. Producción principal: **DonHost** (`https://pewenche.cl`).

## Contacto oficial (público)

| Canal            | Valor                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Correo           | `pewenchepropiedades@gmail.com`                                                                  |
| Instagram        | [https://www.instagram.com/pewenchepropiedades/](https://www.instagram.com/pewenchepropiedades/) |
| WhatsApp         | +56 9 8289 1650                                                                                  |
| Admin (Supabase) | `admin@pewenche.cl` — solo panel interno                                                         |

Fuente única en código: `js/config.js` → `CONTACT`.

---

## 1. Una vez (estado actual)

- [x] **DonHost** — sitio en `public_html` (`https://pewenche.cl`)
- [x] **DNS** — nic.cl → `ns1`–`ns4.donhost.cl` (dominio quitado de Vercel)
- [x] **Vercel** — respaldo en [https://pewenche.vercel.app](https://pewenche.vercel.app)
- [x] **GitHub Pages** — [https://kirit0-1.github.io/pewenche/](https://kirit0-1.github.io/pewenche/)
- [ ] **Supabase SQL** — confirmar en SQL Editor:
  - `supabase/schema-v2-rls.sql`
  - `supabase/schema-leads-hardening.sql`
  - `supabase/schema-leads-retention.sql` (activar **Integrations → Cron** / `pg_cron` antes)
- [ ] **Auth** — sign-ups deshabilitados; usuario `admin@pewenche.cl` activo
- [ ] **Instagram / Gmail** — bio y firma con enlace a `https://pewenche.cl`

---

## 2. Rutina mensual (~30 min)

### Contenido

- [ ] Revisar propiedades: precios UF, fotos, descripciones, ubicación
- [ ] Quitar o marcar vendida/arrendada lo no disponible
- [ ] Subir 1–2 propiedades nuevas si hay stock

### Consultas (leads)

- [ ] Admin → **Consultas** → responder pendientes
- [ ] Botón **Borrar consultas +14 días** (o verificar cron en Supabase)
- [ ] Probar formulario de contacto en `pewenche.cl` (1 envío de prueba)

### Respaldo

- [ ] Admin → **Configuración** → **Crear respaldo en Supabase**
- [ ] Opcional: exportar `leads` y `properties` desde Supabase Dashboard

### Técnico

- [ ] Abrir sitio en móvil: menú, WhatsApp flotante, listado
- [ ] Verificar indicador UF en header (mindicador.cl)
- [ ] Ctrl+F5 en `https://pewenche.cl` tras cada subida a DonHost

---

## 3. Rutina trimestral

- [ ] Cambiar contraseña admin en Supabase Auth
- [ ] Revisar políticas RLS en Supabase
- [ ] Actualizar dependencias: `npm outdated` → `npm update` → probar local → push
- [ ] Regenerar pack DonHost: `npm run pack:donhost` → subir zip a `public_html` y Extraer
- [ ] Revisar enlaces rotos / imágenes en Storage

---

## 4. Mini auditoría (nov 2026)


| Área                  | Estado | Notas                                      |
| --------------------- | ------ | ------------------------------------------ |
| Contacto              | OK     | `js/config.js`                             |
| WhatsApp / Instagram  | OK     | Oficiales                                  |
| Dominio pewenche.cl   | OK     | DonHost + SSL                              |
| Propiedades (API)     | OK     | 5 en Supabase (lectura pública)            |
| Admin                 | OK     | Supabase Auth                              |
| Retención leads 14 d  | Revisar| Activar Cron + SQL retention               |
| Modo visual           | OK     | Solo claro                                 |
| Facebook              | Revisar| URL genérica `facebook.com/pewenche`       |
| OG image              | OK     | `https://pewenche.cl/img/og-pewenche.jpg`  |


---

## 5. Comandos útiles

```powershell
cd C:\Users\josue\Desktop\Pewenche
npm install
npm run build
npm start
npm run pack:donhost   # genera dist-hosting/ + usar zip pewenche-donhost.zip
```

### Subida DonHost

1. cPanel → Administrador de archivos → `public_html`
2. Subir `pewenche-donhost.zip` → **Extraer** (sobrescribir)
3. Borrar el zip del servidor
4. Ctrl+F5 en `https://pewenche.cl`

---

## 6. Después de cada cambio importante

1. Probar en local (`npm start`)
2. Commit + push a `main` (actualiza Vercel / Pages)
3. `npm run pack:donhost` y subir a DonHost
4. Ctrl+F5 en producción

---

*Última revisión de mantenimiento: noviembre 2026*
