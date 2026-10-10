-- Seven namespaces only; Plugora's existing tables are not changed.
create table public.seven_tours (
 id text primary key,
 owner text not null,
 revision text not null,
 data jsonb not null,
 check (id = data->>'id' and owner = data->>'owner' and revision = data->>'revision'),
 check (jsonb_typeof(data->'scenes') = 'array' and jsonb_array_length(data->'scenes') <= 100)
);
create index seven_tours_owner_idx on public.seven_tours(owner);
create table public.seven_login_limits (key text primary key, attempts integer not null, expires bigint not null);
create index seven_login_limits_expires_idx on public.seven_login_limits(expires);
create table public.seven_settings (key text primary key, value jsonb not null);
alter table public.seven_tours enable row level security;
alter table public.seven_login_limits enable row level security;
alter table public.seven_settings enable row level security;
revoke all on public.seven_tours, public.seven_login_limits, public.seven_settings from anon, authenticated;
grant select,insert,update,delete on public.seven_tours, public.seven_login_limits, public.seven_settings to service_role;
-- The server authenticates the studio cookie; no direct browser table access.
create function public.seven_login_attempt(attempt_key text, expires_at bigint)
returns integer language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
 delete from public.seven_login_limits where expires < (extract(epoch from clock_timestamp()) * 1000)::bigint;
 insert into public.seven_login_limits(key,attempts,expires) values(attempt_key,1,expires_at)
 on conflict(key) do update set attempts=public.seven_login_limits.attempts+1 returning attempts into total;
 return total;
end;
$$;
revoke all on function public.seven_login_attempt(text,bigint) from public, anon, authenticated;
grant execute on function public.seven_login_attempt(text,bigint) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('seven-tour-360','seven-tour-360',false,20971520,array['image/jpeg','image/png','image/webp']);
