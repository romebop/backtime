-- sync state tracking per user
create table sync_state (
  user_id uuid primary key references auth.users,
  last_synced_at timestamptz,
  gmail_history_id text
);

-- RLS policies
alter table sync_state enable row level security;

create policy "users can read their own sync state"
  on sync_state for select
  using (user_id = auth.uid());

create policy "users can insert their own sync state"
  on sync_state for insert
  with check (user_id = auth.uid());

create policy "users can update their own sync state"
  on sync_state for update
  using (user_id = auth.uid());
