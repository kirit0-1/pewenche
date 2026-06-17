-- Pewenche — ejecutar en Supabase SQL Editor

-- Propiedades
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

-- Consultas de clientes
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

-- Clics en propiedades
create table if not exists public.clicks (
  id          bigint generated always as identity primary key,
  property_id text not null,
  created_at  timestamptz default now()
);

-- Respaldos automáticos
create table if not exists public.backups (
  id          bigint generated always as identity primary key,
  label       text default '',
  data        jsonb not null,
  created_at  timestamptz default now()
);

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

alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.clicks enable row level security;
alter table public.backups enable row level security;

drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties for select using (true);

drop policy if exists "properties_write" on public.properties;
create policy "properties_write" on public.properties for all using (true) with check (true);

drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select using (true);

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads for insert with check (true);

drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads for update using (true);

drop policy if exists "clicks_insert" on public.clicks;
create policy "clicks_insert" on public.clicks for insert with check (true);

drop policy if exists "clicks_select" on public.clicks;
create policy "clicks_select" on public.clicks for select using (true);

drop policy if exists "backups_all" on public.backups;
create policy "backups_all" on public.backups for all using (true) with check (true);

-- Storage bucket para imágenes (crear también en Dashboard → Storage → property-images, público)
-- insert into storage.buckets (id, name, public) values ('property-images', 'property-images', true);
