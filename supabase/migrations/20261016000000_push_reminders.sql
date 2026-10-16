-- Daily reminders by web push.
--
-- One row per browser that asked for a reminder. Only the server touches this
-- table (with the service-role key, from /api/reminders): RLS is on with no
-- policies, so the public key can neither read nor write it.

create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  p256dh        text not null,
  auth          text not null,
  user_id       uuid references auth.users (id) on delete cascade,
  remind_at     time not null default '21:00',
  timezone      text not null default 'Asia/Kolkata',
  last_sent_on  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
