-- PayUber clone: payment sessions table
-- Run this in the Supabase SQL editor for project bxtfaxfpohpmyetwjezm

create table if not exists public.payuber_sessions (
  id uuid primary key default gen_random_uuid(),
  pickup_address text not null,
  dropoff_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  route_geometry jsonb,
  distance_km double precision,
  duration_min integer,
  ride_type text not null,
  ride_name text,
  amount double precision not null,
  status text default 'pending',
  created_at timestamptz default now()
);

alter publication supabase_realtime add table public.payuber_sessions;

create index if not exists payuber_sessions_created_at_idx on public.payuber_sessions (created_at desc);
