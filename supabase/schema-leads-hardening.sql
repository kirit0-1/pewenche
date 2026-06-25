-- Endurecimiento de consultas (leads) — ejecutar en Supabase SQL Editor
-- Seguro de ejecutar varias veces

-- Admin puede borrar consultas antiguas desde el panel
drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads
  for delete to authenticated
  using (public.is_pewenche_admin());

-- Validación al insertar (visitantes anon + admin)
create or replace function public.sanitize_lead_row()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(left(coalesce(new.email, ''), 254)));
  new.nombre := left(regexp_replace(coalesce(new.nombre, ''), '<[^>]+>', '', 'g'), 120);
  new.mensaje := left(regexp_replace(coalesce(new.mensaje, ''), '<[^>]+>', '', 'g'), 1000);
  new.property_id := left(coalesce(new.property_id, 'general'), 80);
  new.property_title := left(coalesce(new.property_title, 'Consulta web'), 200);

  if new.email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'Correo no válido';
  end if;
  if new.nombre = '' then
    new.nombre := split_part(new.email, '@', 1);
  end if;
  return new;
end;
$$;

drop trigger if exists leads_sanitize on public.leads;
create trigger leads_sanitize
  before insert or update on public.leads
  for each row execute function public.sanitize_lead_row();
