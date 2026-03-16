-- Unique constraint to prevent duplicate items from the same email
create unique index items_user_email_unique on items (user_id, email_id) where email_id is not null;
