-- Migración RLS segura (ejecutar si ya tenías el schema antiguo abierto)
-- Antes: crea usuario admin@pewenche.cl en Supabase → Authentication → Users

drop policy if exists "properties_write" on public.properties;
drop policy if exists "properties_insert" on public.properties;
drop policy if exists "properties_update" on public.properties;
drop policy if exists "properties_delete" on public.properties;
create policy "properties_insert" on public.properties for insert to authenticated with check (true);
create policy "properties_update" on public.properties for update to authenticated using (true);
create policy "properties_delete" on public.properties for delete to authenticated using (true);

drop policy if exists "leads_select" on public.leads;
drop policy if exists "leads_insert" on public.leads;
drop policy if exists "leads_update" on public.leads;
create policy "leads_insert" on public.leads for insert to anon, authenticated with check (true);
create policy "leads_select" on public.leads for select to authenticated using (true);
create policy "leads_update" on public.leads for update to authenticated using (true);

drop policy if exists "clicks_insert" on public.clicks;
drop policy if exists "clicks_select" on public.clicks;
create policy "clicks_insert" on public.clicks for insert to anon, authenticated with check (true);
create policy "clicks_select" on public.clicks for select to authenticated using (true);

drop policy if exists "backups_all" on public.backups;
create policy "backups_select" on public.backups for select to authenticated using (true);
create policy "backups_insert" on public.backups for insert to authenticated with check (true);

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = true;

drop policy if exists "property_images_read" on storage.objects;
drop policy if exists "property_images_upload" on storage.objects;
create policy "property_images_read" on storage.objects
  for select using (bucket_id = 'property-images');
create policy "property_images_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-images');
