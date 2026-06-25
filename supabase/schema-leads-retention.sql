-- Borrado automático de consultas con más de 14 días
-- Ejecutar en Supabase → SQL Editor (requiere extensión pg_cron)

-- 1) Habilitar pg_cron: Dashboard → Database → Extensions → pg_cron → Enable

-- 2) Función de limpieza
create or replace function public.purge_old_leads(days integer default 14)
returns integer language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
  delete from public.leads
  where created_at < now() - make_interval(days => days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 3) Programar limpieza diaria a las 03:00 UTC (medianoche Chile en invierno aprox.)
-- Si el job ya existe, primero: select cron.unschedule('purge-pewenche-leads');
select cron.schedule(
  'purge-pewenche-leads',
  '0 3 * * *',
  $$ select public.purge_old_leads(14); $$
);

-- Borrado manual inmediato (opcional):
-- select public.purge_old_leads(14);
