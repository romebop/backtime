-- user preferences
create table user_preferences (
  user_id uuid primary key references auth.users,
  theme text not null default 'light'
    check (theme in ('light', 'dark'))
);

-- RLS policies
alter table user_preferences enable row level security;

create policy "users can read their own preferences"
  on user_preferences for select
  using (user_id = auth.uid());

create policy "users can insert their own preferences"
  on user_preferences for insert
  with check (user_id = auth.uid());

create policy "users can update their own preferences"
  on user_preferences for update
  using (user_id = auth.uid());
