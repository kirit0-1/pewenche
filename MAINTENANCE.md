# Mantenimiento — Pewenche Propiedades

Checklist para el **primer mantenimiento** y rutinas periódicas.

## Contacto oficial (público)

| Canal | Valor |
|-------|--------|
| Correo | `pewenchepropiedades@gmail.com` |
| Instagram | https://www.instagram.com/pewenchepropiedades/ |
| WhatsApp | +56 9 8289 1650 |
| Admin (Supabase) | `admin@pewenche.cl` — solo panel interno |

Fuente única en código: `js/config.js` → `CONTACT`.

---

## 1. Antes del primer mantenimiento (una vez)

- [ ] **Vercel** — confirmar deploy en https://pewenche.vercel.app tras cada push a `main`
- [ ] **Supabase** — ejecutar en SQL Editor (si no se hizo):
  - `supabase/schema-v2-rls.sql`
  - `supabase/schema-leads-hardening.sql`
  - `supabase/schema-leads-retention.sql` (requiere extensión `pg_cron`)
- [ ] **Variables Vercel** — `SUPABASE_URL` y `SUPABASE_ANON_KEY` configuradas
- [ ] **Auth** — sign-ups deshabilitados; usuario `admin@pewenche.cl` activo
- [ ] **Dominio** — cuando esté listo: apuntar `pewenche.cl` en Vercel + DNS en NIC
- [ ] **Instagram / Gmail** — bio y firma de correo con enlace a la web

---

## 2. Rutina mensual (~30 min)

### Contenido
- [ ] Revisar propiedades publicadas: precios UF, fotos, descripciones, ubicación
- [ ] Quitar o marcar como vendida/arrendada lo que ya no esté disponible
- [ ] Subir 1–2 propiedades nuevas si hay stock

### Consultas (leads)
- [ ] Admin → **Consultas** → responder pendientes
- [ ] Botón **Borrar consultas +14 días** (o verificar cron en Supabase)
- [ ] Probar formulario de contacto en producción (1 envío de prueba)

### Respaldo
- [ ] Admin → **Configuración** → **Crear respaldo en Supabase**
- [ ] Opcional: exportar tabla `leads` y `properties` desde Supabase Dashboard

### Técnico
- [ ] Abrir sitio en móvil: menú, tema claro/oscuro, WhatsApp flotante
- [ ] Verificar indicador UF en header (mindicador.cl)
- [ ] Revisar Vercel → Deployments (último build OK)

---

## 3. Rutina trimestral

- [ ] Cambiar contraseña admin en Supabase Auth
- [ ] Revisar políticas RLS en Supabase
- [ ] Actualizar dependencias: `npm outdated` → `npm update` → probar local → push
- [ ] Si usas DonHost: `npm run pack:donhost` y subir zip si no usas Vercel
- [ ] Revisar enlaces rotos en propiedades (imágenes externas)

---

## 4. Mini auditoría (estado actual)

| Área | Estado | Notas |
|------|--------|-------|
| Contacto centralizado | OK | `js/config.js` |
| WhatsApp | OK | +56 9 8289 1650 |
| Correo público | OK | Gmail oficial |
| Instagram | OK | @pewenchepropiedades |
| Admin producción | OK | Supabase Auth, no contraseña en JS |
| Leads en nube | OK | Supabase + validación + rate limit |
| Retención leads | Pendiente verificar | SQL + botón admin 14 días |
| Dominio pewenche.cl | Pendiente | Vercel + NIC cuando cliente confirme |
| Facebook | Revisar | URL genérica en config — actualizar si hay página real |
| CSP / headers | OK | `vercel.json` |
| Modo claro / oscuro | OK | Corregido en `css/styles.css` |

---

## 5. Comandos útiles

```powershell
cd C:\Users\josue\Desktop\ded
npm install
npm run build      # genera bundle antes de deploy
npm start          # local con API Node (dev)
npm run pack:donhost   # zip para DonHost
npm run seed:supabase  # propiedades demo (solo si hace falta)
```

---

## 6. Después de cada cambio importante

1. Probar en local (`npm start` o `npm run static`)
2. Commit + push a `main`
3. Esperar deploy Vercel (~2 min)
4. Ctrl+F5 en producción y verificar sección afectada

---

*Última actualización de contacto: junio 2026*
