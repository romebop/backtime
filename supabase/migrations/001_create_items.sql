-- items table
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  merchant text,
  price numeric,
  purchase_date timestamptz,
  return_by_date timestamptz,
  warranty_end_date timestamptz,
  status text not null default 'active'
    check (status in ('active', 'return_eligible', 'warranty_only', 'expired')),
  source text not null default 'manual'
    check (source in ('email_scan', 'manual', 'chrome_extension')),
  order_number text,
  email_id text,
  return_policy jsonb,
  created_at timestamptz default now()
);

-- index for fetching user's items
create index items_user_id_idx on items (user_id);

-- index for notification queries (items expiring soon)
create index items_return_by_date_idx on items (return_by_date);

-- RLS policies
alter table items enable row level security;

create policy "users can read their own items"
  on items for select
  using (user_id = auth.uid());

create policy "users can insert their own items"
  on items for insert
  with check (user_id = auth.uid());

create policy "users can update their own items"
  on items for update
  using (user_id = auth.uid());

create policy "users can delete their own items"
  on items for delete
  using (user_id = auth.uid());
