-- MoneyMap SplitMap Groups & Invitations: run this in Supabase SQL Editor.

-- Groups (one per row, owned by user)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  members jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Group expenses (deleted when group is deleted)
create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id text not null,
  category text not null,
  label text not null,
  amount numeric not null,
  currency text not null,
  shares jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Group settlements (deleted when group is deleted)
create table if not exists public.group_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_id text not null,
  to_id text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

-- Group invitations (for in-app notifications and email sharing)
create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_email text not null,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  inviter_name text,
  group_name text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Profiles for app preferences and auth bootstrap.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_settlements enable row level security;
alter table public.group_invitations enable row level security;
alter table public.profiles enable row level security;

-- RLS Policies
drop policy if exists "Users can manage own groups" on public.groups;
create policy "Users can manage groups"
  on public.groups for all
  using (
    auth.uid() = user_id 
    or members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
    or auth.uid() is not null
  );

drop policy if exists "Users can manage expenses of own groups" on public.group_expenses;
create policy "Users can manage expenses"
  on public.group_expenses for all
  using (auth.uid() is not null);

drop policy if exists "Users can manage settlements of own groups" on public.group_settlements;
create policy "Users can manage settlements"
  on public.group_settlements for all
  using (auth.uid() is not null);

drop policy if exists "Users can view invitations" on public.group_invitations;
create policy "Users can view invitations"
  on public.group_invitations for all
  using (auth.uid() is not null);

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Indexes
create index if not exists idx_groups_user_id on public.groups(user_id);
create index if not exists idx_group_expenses_group_id on public.group_expenses(group_id);
create index if not exists idx_group_settlements_group_id on public.group_settlements(group_id);
create index if not exists idx_group_invitations_email on public.group_invitations(invited_email);
