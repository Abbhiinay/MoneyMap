-- MoneyMap SplitMap Groups: run this in Supabase SQL Editor to create tables.

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

-- RLS: users can only access their own groups and that group's expenses
alter table public.groups enable row level security;
alter table public.group_expenses enable row level security;

create policy "Users can manage own groups"
  on public.groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage expenses of own groups"
  on public.group_expenses for all
  using (
    group_id in (select id from public.groups where user_id = auth.uid())
  )
  with check (
    group_id in (select id from public.groups where user_id = auth.uid())
  );

-- Indexes
create index if not exists idx_groups_user_id on public.groups(user_id);
create index if not exists idx_group_expenses_group_id on public.group_expenses(group_id);
