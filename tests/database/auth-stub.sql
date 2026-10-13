-- LOCAL TEST CLUSTER ONLY. Supabase supplies these roles/tables in real projects.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls;end if;
end;$$;
create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}',email_confirmed_at timestamptz,last_sign_in_at timestamptz);
create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,provider text not null,provider_id text not null,identity_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
