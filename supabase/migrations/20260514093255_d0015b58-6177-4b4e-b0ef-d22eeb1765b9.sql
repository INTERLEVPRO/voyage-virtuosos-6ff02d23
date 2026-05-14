
create table if not exists public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  destination text,
  departure_airport text,
  travelers int,
  budget int,
  travel_dates text,
  vacation_type text,
  preferences jsonb,
  raw_brief text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  trip_request_id uuid references public.trip_requests(id) on delete cascade,
  package_type text not null,
  title text,
  price int,
  rating numeric,
  match_score int,
  summary text,
  data jsonb not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete set null,
  provider text,
  url text,
  created_at timestamp with time zone not null default now()
);

alter table public.trip_requests enable row level security;
alter table public.packages enable row level security;
alter table public.affiliate_clicks enable row level security;

-- MVP: no auth. Allow public read of generated packages & trip briefs (no PII), and allow public insert of affiliate click logs.
create policy "Public read trip_requests" on public.trip_requests for select using (true);
create policy "Public read packages" on public.packages for select using (true);
create policy "Public insert affiliate_clicks" on public.affiliate_clicks for insert with check (true);
