-- Borrado automático de consultas con más de 14 días
-- Ejecutar en Supabase → SQL Editor
--
-- ANTES: habilita Cron por UI (más seguro):
--   Dashboard → Integrations → Cron → Enable
--   o Database → Extensions → pg_cron → Enable
--
-- Si ya activaste la extensión y falló cron.schedule, vuelve a correr ESTE archivo completo.

-- 1) Extensión (crea el schema "cron")
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 2) Función de limpieza
create or replace function public.purge_old_leads(days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.leads
  where created_at < now() - make_interval(days => days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 3) Job diario 03:00 UTC
-- Si el job ya existe, descomenta la línea siguiente:
-- select cron.unschedule('purge-pewenche-leads');

select cron.schedule(
  'purge-pewenche-leads',
  '0 3 * * *',
  $$ select public.purge_old_leads(14); $$
);

-- 4) Prueba inmediata (opcional):
-- select public.purge_old_leads(14);
