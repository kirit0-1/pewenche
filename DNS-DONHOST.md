# DNS pewenche.cl → DonHost

## Datos de tu cuenta DonHost (cPanel)

| Dato | Valor |
|------|--------|
| Usuario | `pewenche` |
| Dominio principal | `pewenche.cl` |
| IP compartida | `167.114.185.225` |
| Home | `/home/pewenche` |
| Servidor | `srv37.donhost.cl` |
| SSL | Activo |

Paquete local listo: `dist-hosting/` y `pewenche-donhost.zip`.

## 1) Subir el sitio (cPanel)

1. En cPanel → **Archivos** → **Administrador de archivos**.
2. Entra a `public_html`.
3. Borra el `index.html` / placeholders por defecto de DonHost (si hay).
4. Sube **el contenido** de `dist-hosting` (o el zip y descomprime **dentro** de `public_html`).
5. Debe quedar así:
   - `public_html/index.html`
   - `public_html/propiedad.html`
   - `public_html/.htaccess`
   - `public_html/css/`
   - `public_html/js/`
   - `public_html/img/`

## 2) DNS en nic.cl (obligatorio)

En [nic.cl](https://nic.cl) → `pewenche.cl` → **Servidores de nombre autorizados**, deja solo:

```
ns1.donhost.cl
ns2.donhost.cl
ns3.donhost.cl
ns4.donhost.cl
```

Propagación: minutos a 24–48 h.

## 3) DNS dentro de DonHost (Zone Editor)

Si nic.cl ya apunta a DonHost, en cPanel → **Dominios** → **Zone Editor** verifica:

| Tipo | Nombre | Valor |
|------|--------|--------|
| A | `pewenche.cl` / `@` | `167.114.185.225` |
| CNAME o A | `www` | `pewenche.cl` o misma IP |

SSL ya aparece **Active** en cPanel; si `https://` falla, espera propagación DNS y fuerza AutoSSL.

## 4) Probar

- https://pewenche.cl
- https://www.pewenche.cl

Mientras propaga: https://pewenche.vercel.app
