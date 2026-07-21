# DNS pewenche.cl → DonHost

## Estado preparado (hoy)

- Dominio **sacado de Vercel** (ya no usa `ns1.vercel-dns.com`).
- Paquete listo: `dist-hosting/` y `pewenche-donhost.zip`.
- Falta solo cambiar nameservers en **NIC Chile** (tú debes hacerlo con tu cuenta).

## Qué poner en nic.cl

Entra a [https://nic.cl](https://nic.cl) → dominio `pewenche.cl` → **Servidores de nombre autorizados**.

Reemplaza los actuales por **exactamente** estos 4 (borra los de Vercel u otros):

```
ns1.donhost.cl
ns2.donhost.cl
ns3.donhost.cl
ns4.donhost.cl
```

Guarda. Propagación: desde minutos hasta 24–48 horas.

## Después de cambiar NIC

1. En DonHost / cPanel, confirma el dominio `pewenche.cl` (y `www`) → `public_html`.
2. Sube el contenido de `dist-hosting/` a `public_html`.
3. Activa SSL (Let’s Encrypt / AutoSSL) cuando el dominio ya apunte a DonHost.
4. Prueba: `https://pewenche.cl` y `https://www.pewenche.cl`.

## Mientras tanto (ya online)

- https://pewenche.vercel.app
- https://kirit0-1.github.io/pewenche/
