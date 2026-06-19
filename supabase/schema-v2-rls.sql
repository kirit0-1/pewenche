-- Migración RLS segura v3 — SEGURO de ejecutar varias veces
-- Requisitos: usuario admin@pewenche.cl en Supabase Auth; sign-ups deshabilitados

create or replace function public.is_pewenche_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@pewenche.cl';
$$;

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_clicks_property on public.clicks (property_id);
create index if not exists idx_clicks_created_at on public.clicks (created_at desc);

-- Eliminar TODAS las políticas existentes en tablas public (evita "already exists")
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('properties', 'leads', 'clicks', 'backups')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Propiedades: lectura pública, escritura solo admin
create policy "properties_select" on public.properties for select using (true);
create policy "properties_insert" on public.properties for insert to authenticated with check (public.is_pewenche_admin());
create policy "properties_update" on public.properties for update to authenticated using (public.is_pewenche_admin());
create policy "properties_delete" on public.properties for delete to authenticated using (public.is_pewenche_admin());

-- Leads: visitantes insertan, admin lee/actualiza
create policy "leads_insert" on public.leads for insert to anon, authenticated with check (true);
create policy "leads_select" on public.leads for select to authenticated using (public.is_pewenche_admin());
create policy "leads_update" on public.leads for update to authenticated using (public.is_pewenche_admin());

-- Clics
create policy "clicks_insert" on public.clicks for insert to anon, authenticated with check (true);
create policy "clicks_select" on public.clicks for select to authenticated using (public.is_pewenche_admin());

-- Respaldos
create policy "backups_select" on public.backups for select to authenticated using (public.is_pewenche_admin());
create policy "backups_insert" on public.backups for insert to authenticated with check (public.is_pewenche_admin());

-- Storage
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = true;

do $$
declare r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'property_images%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "property_images_read" on storage.objects
  for select using (bucket_id = 'property-images');
create policy "property_images_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-images' and public.is_pewenche_admin());
create policy "property_images_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'property-images' and public.is_pewenche_admin());
