-- Migración RLS segura v3 — ejecutar si ya tenías schema antiguo
-- Requisitos: usuario admin@pewenche.cl en Supabase Auth; sign-ups deshabilitados

create or replace function public.is_pewenche_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@pewenche.cl';
$$;

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_clicks_property on public.clicks (property_id);
create index if not exists idx_clicks_created_at on public.clicks (created_at desc);

drop policy if exists "properties_write" on public.properties;
drop policy if exists "properties_insert" on public.properties;
drop policy if exists "properties_update" on public.properties;
drop policy if exists "properties_delete" on public.properties;
create policy "properties_insert" on public.properties for insert to authenticated with check (public.is_pewenche_admin());
create policy "properties_update" on public.properties for update to authenticated using (public.is_pewenche_admin());
create policy "properties_delete" on public.properties for delete to authenticated using (public.is_pewenche_admin());

drop policy if exists "leads_select" on public.leads;
drop policy if exists "leads_insert" on public.leads;
drop policy if exists "leads_update" on public.leads;
create policy "leads_insert" on public.leads for insert to anon, authenticated with check (true);
create policy "leads_select" on public.leads for select to authenticated using (public.is_pewenche_admin());
create policy "leads_update" on public.leads for update to authenticated using (public.is_pewenche_admin());

drop policy if exists "clicks_insert" on public.clicks;
drop policy if exists "clicks_select" on public.clicks;
create policy "clicks_insert" on public.clicks for insert to anon, authenticated with check (true);
create policy "clicks_select" on public.clicks for select to authenticated using (public.is_pewenche_admin());

drop policy if exists "backups_all" on public.backups;
drop policy if exists "backups_select" on public.backups;
drop policy if exists "backups_insert" on public.backups;
create policy "backups_select" on public.backups for select to authenticated using (public.is_pewenche_admin());
create policy "backups_insert" on public.backups for insert to authenticated with check (public.is_pewenche_admin());

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = true;

drop policy if exists "property_images_read" on storage.objects;
drop policy if exists "property_images_upload" on storage.objects;
drop policy if exists "property_images_delete" on storage.objects;
create policy "property_images_read" on storage.objects
  for select using (bucket_id = 'property-images');
create policy "property_images_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-images' and public.is_pewenche_admin());
create policy "property_images_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'property-images' and public.is_pewenche_admin());
