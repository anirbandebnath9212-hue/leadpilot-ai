-- LeadPilot AI V2 database
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text default 'My Business',
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  status text not null default 'New' check (status in ('New','Interested','Qualified','Follow-up','Converted','Lost')),
  score integer not null default 50 check (score between 0 and 100),
  notes text,
  last_activity timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "leads own rows" on public.leads;
create policy "leads own rows" on public.leads
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional demo data: run only after creating a user and replacing USER_ID.
-- insert into public.leads(user_id,name,company,email,status,score)
-- values ('USER_ID','Arjun Mehta','Nova Labs','arjun@novalabs.io','Qualified',92);
