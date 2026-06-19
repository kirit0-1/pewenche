-- Pewenche — schema seguro (SQL Editor de Supabase)
-- 1. Deshabilita "Sign ups" en Authentication → Providers → Email
-- 2. Crea usuario admin@pewenche.cl en Authentication → Users

create table if not exists public.properties (
  id          text primary key,
  titulo      text not null,
  tipo        text not null check (tipo in ('venta','arriendo','hostal','camping','terreno')),
  region      text not null default '',
  comuna      text not null default '',
  direccion   text default '',
  lat         double precision,
  lng         double precision,
  precio_uf   numeric default 0,
  precio_nota text default '',
  precio_clp  text default '',
  superficie  integer default 0,
  dorms       integer default 0,
  banos       integer default 0,
  estac       integer default 0,
  "desc"      text default '',
  desc_larga  text default '',
  imagenes    jsonb default '[]'::jsonb,
  extras      jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.leads (
  id              text primary key,
  property_id     text,
  property_title  text default '',
  nombre          text not null,
  email           text not null,
  mensaje         text default '',
  contacted       boolean default false,
  created_at      timestamptz default now()
);

create table if not exists public.clicks (
  id          bigint generated always as identity primary key,
  property_id text not null,
  created_at  timestamptz default now()
);

create table if not exists public.backups (
  id          bigint generated always as identity primary key,
  label       text default '',
  data        jsonb not null,
  created_at  timestamptz default now()
);

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_clicks_property on public.clicks (property_id);
create index if not exists idx_clicks_created_at on public.clicks (created_at desc);

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.update_updated_at();

-- Solo admin@pewenche.cl puede gestionar datos sensibles
create or replace function public.is_pewenche_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@pewenche.cl';
$$;

alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.clicks enable row level security;
alter table public.backups enable row level security;

drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties for select using (true);

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
