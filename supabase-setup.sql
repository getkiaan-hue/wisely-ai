-- Wisely AI: run this ONCE in Supabase (SQL Editor -> New query -> paste -> Run).
-- It makes a table that remembers each person's plan and how many messages they sent today,
-- plus three small functions the Wisely server uses. Days reset at midnight New York time.

create table if not exists public.usage (
  user_id uuid primary key references auth.users on delete cascade,
  plan    text not null default 'free',          -- 'free' or 'pro'
  day     date not null default ((now() at time zone 'America/New_York')::date),
  count   int  not null default 0
);

-- Lock the table so only the Wisely server (with the secret key) can read or change it.
alter table public.usage enable row level security;

-- Uses one message if the person still has some left today.
create or replace function public.use_message(uid uuid, free_limit int)
returns json language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/New_York')::date;
  r public.usage;
begin
  insert into public.usage (user_id, day, count) values (uid, today, 0) on conflict (user_id) do nothing;
  select * into r from public.usage where user_id = uid for update;
  if r.day <> today then
    update public.usage set day = today, count = 0 where user_id = uid;
    r.count := 0;
  end if;
  if r.plan <> 'pro' and r.count >= free_limit then
    return json_build_object('allowed', false, 'plan', r.plan, 'used', r.count, 'limit', free_limit);
  end if;
  update public.usage set count = r.count + 1 where user_id = uid;
  return json_build_object('allowed', true, 'plan', r.plan, 'used', r.count + 1, 'limit', free_limit);
end $$;

-- Gives a message back (used when the AI had an error).
create or replace function public.refund_message(uid uuid)
returns void language sql security definer set search_path = public as $$
  update public.usage set count = greatest(count - 1, 0)
  where user_id = uid and day = (now() at time zone 'America/New_York')::date;
$$;

-- Shows today's count without using a message.
create or replace function public.get_usage(uid uuid, free_limit int)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'plan',  coalesce((select plan from public.usage where user_id = uid), 'free'),
    'used',  coalesce((select count from public.usage where user_id = uid
                       and day = (now() at time zone 'America/New_York')::date), 0),
    'limit', free_limit);
$$;

-- Only the server may run these functions.
revoke execute on function public.use_message(uuid, int)  from public, anon, authenticated;
revoke execute on function public.refund_message(uuid)    from public, anon, authenticated;
revoke execute on function public.get_usage(uuid, int)    from public, anon, authenticated;
