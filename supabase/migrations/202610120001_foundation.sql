-- ARK foundation. Apply explicitly through Supabase CLI or the SQL editor.
-- No user data or synthetic launch activity is seeded.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

create table private.account_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','deleting')),
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  suspension_reason text
);
create table private.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_follows boolean not null default true,
  notify_upvotes boolean not null default true,
  notify_launches boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table private.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key(user_id, role)
);
alter table private.account_controls enable row level security;
alter table private.account_settings enable row level security;
alter table private.user_roles enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

create function private.is_active(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.account_controls where user_id = p_id and status = 'active');
$$;
revoke all on function private.is_active(uuid) from public;
grant execute on function private.is_active(uuid) to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or (username ~ '^[a-z0-9_]{3,30}$' and username not in ('admin','ark','api','auth','collections','explore','following','login','logout','makers','notifications','onboarding','projects','publish','search','settings','support'))),
  display_name text not null default '' check (char_length(display_name) <= 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_object_key text,
  github_user_id bigint unique,
  github_username text,
  github_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to anon, authenticated
using ((username is not null and private.is_active(id)) or id = (select auth.uid()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

create function private.bootstrap_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.account_controls(user_id) values(new.id);
  insert into private.account_settings(user_id) values(new.id);
  insert into public.profiles(id, display_name, bio)
  values(new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),80),
    left(coalesce(new.raw_user_meta_data->>'bio',''),500));
  return new;
end;
$$;
revoke all on function private.bootstrap_account() from public, anon, authenticated;
create trigger ark_account_created after insert on auth.users for each row execute function private.bootstrap_account();

-- Existing Auth users are also initialized, without overwriting edited profile values.
insert into private.account_controls(user_id) select id from auth.users on conflict do nothing;
insert into private.account_settings(user_id) select id from auth.users on conflict do nothing;
insert into public.profiles(id, display_name, bio)
select id, left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),80), left(coalesce(raw_user_meta_data->>'bio',''),500)
from auth.users on conflict do nothing;

create function public.my_account_status() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select status from private.account_controls where user_id = auth.uid()), 'suspended');
$$;
revoke all on function public.my_account_status() from public, anon;
grant execute on function public.my_account_status() to authenticated;

create function public.update_my_profile(p_username text, p_display_name text, p_bio text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not private.is_active(actor) then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(trim(p_display_name)) not between 1 and 80 or char_length(p_bio) > 500 or p_username is null or p_display_name is null or p_bio is null then
    raise exception 'validation_failed' using errcode = '22023';
  end if;
  update public.profiles set username = lower(trim(p_username)), display_name = trim(p_display_name), bio = trim(p_bio), updated_at = now() where id = actor;
end;
$$;
revoke all on function public.update_my_profile(text,text,text) from public, anon;
grant execute on function public.update_my_profile(text,text,text) to authenticated;

-- Connection values come only from Auth's provider identity, never user_metadata.
-- This is identity confirmation, not repository ownership verification.
create function public.sync_my_github_identity() returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); provider_key text; provider_login text;
begin
  if actor is null or not private.is_active(actor) then raise exception 'forbidden' using errcode = '42501'; end if;
  select provider_id, coalesce(identity_data->>'user_name', identity_data->>'preferred_username')
  into provider_key, provider_login from auth.identities where user_id = actor and provider = 'github' limit 1;
  if provider_key ~ '^[0-9]{1,18}$' then
    update public.profiles set github_user_id = provider_key::bigint, github_username = provider_login,
      github_connected_at = coalesce(github_connected_at,now()) where id = actor;
  else
    update public.profiles set github_user_id = null, github_username = null, github_connected_at = null where id = actor;
  end if;
end;
$$;
revoke all on function public.sync_my_github_identity() from public, anon;
grant execute on function public.sync_my_github_identity() to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true
);
create table public.technologies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true
);
alter table public.categories enable row level security;
alter table public.technologies enable row level security;
create policy categories_read on public.categories for select to anon, authenticated using(active);
create policy technologies_read on public.technologies for select to anon, authenticated using(active);
revoke all on public.categories, public.technologies from anon, authenticated;
grant select on public.categories, public.technologies to anon, authenticated;

insert into public.categories(slug,name) values
 ('developer-tools','Developer tools'),('web-apps','Web apps'),('libraries','Libraries'),('ai','AI & machine learning'),('mobile-apps','Mobile apps'),('games','Games'),('other','Other');
insert into public.technologies(slug,name) values
 ('typescript','TypeScript'),('javascript','JavaScript'),('react','React'),('nextjs','Next.js'),('python','Python'),('go','Go'),('rust','Rust'),('supabase','Supabase'),('postgresql','PostgreSQL'),('tailwind','Tailwind CSS'),('swift','Swift'),('kotlin','Kotlin');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  maker_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 2 and 80),
  tagline text not null check(char_length(tagline) between 10 and 160),
  description text not null check(char_length(description) between 100 and 10000),
  live_url text check(live_url is null or live_url ~ '^https://'),
  github_url text check(github_url is null or github_url ~ '^https://github.com/'),
  release_url text check(release_url is null or release_url ~ '^https://'),
  demo_video_url text,
  category_id uuid not null references public.categories(id),
  status text not null default 'draft' check(status in ('draft','published','hidden','deleted')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check(version > 0),
  publish_request_key text not null,
  unique(maker_id,publish_request_key),
  check(coalesce(live_url,github_url,release_url) is not null),
  check(status <> 'published' or published_at is not null)
);
create table public.project_technologies (
  project_id uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id),
  primary key(project_id,technology_id)
);
create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  object_key text not null unique,
  mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')),
  size_bytes integer not null check(size_bytes between 1 and 5242880),
  width integer not null check(width between 1 and 4096),
  height integer not null check(height between 1 and 4096),
  alt_text text not null check(char_length(alt_text) between 1 and 500),
  position smallint not null check(position between 0 and 7),
  state text not null default 'staged' check(state in ('staged','ready','removed')),
  created_at timestamptz not null default now(),
  unique(project_id,position), unique(project_id,id)
);
alter table public.projects add column cover_media_id uuid;
alter table public.projects add constraint cover_belongs_to_project foreign key(id,cover_media_id) references public.project_media(project_id,id) deferrable initially deferred;

create table public.upvotes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,project_id)
);
create index projects_latest on public.projects(status,published_at desc,id desc);
create index projects_maker on public.projects(maker_id,status,published_at desc);
create index projects_category on public.projects(category_id,status,published_at desc);
create index project_stack on public.project_technologies(technology_id,project_id);
create index upvotes_project on public.upvotes(project_id,user_id);

create function private.project_visible(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.projects p join public.profiles m on m.id = p.maker_id where p.id = p_id and p.status = 'published' and m.username is not null and private.is_active(m.id));
$$;
revoke all on function private.project_visible(uuid) from public;
grant execute on function private.project_visible(uuid) to anon, authenticated;

alter table public.projects enable row level security;
alter table public.project_technologies enable row level security;
alter table public.project_media enable row level security;
alter table public.upvotes enable row level security;
create policy projects_read on public.projects for select to anon,authenticated using(private.project_visible(id));
create policy project_stack_read on public.project_technologies for select to anon,authenticated using(private.project_visible(project_id));
-- Object paths stay server-only until signed-media authorization is implemented.
create policy upvotes_own_read on public.upvotes for select to authenticated using(user_id = (select auth.uid()) and private.is_active(user_id));
revoke all on public.projects,public.project_technologies,public.project_media,public.upvotes from anon,authenticated;
grant select on public.projects,public.project_technologies to anon,authenticated;
grant select on public.upvotes to authenticated;

-- An intentionally narrow, elevated read: aggregate counts without raw voter identities.
-- Every row is independently checked for maker visibility; no client actor is accepted.
create function public.list_projects(
  p_feed text default 'popular', p_category text default null, p_stack text[] default '{}',
  p_query text default '', p_cursor jsonb default null, p_limit integer default 20, p_maker uuid default null
) returns table(id uuid,name text,tagline text,description text,live_url text,github_url text,release_url text,
  published_at timestamptz,maker_id uuid,maker_username text,maker_name text,category text,category_slug text,stack text[],upvote_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_feed not in ('popular','latest') or char_length(p_query) > 100 or cardinality(p_stack) > 10 then raise exception 'validation_failed' using errcode = '22023'; end if;
  return query
  with summaries as (
    select p.id,p.name,p.tagline,p.description,p.live_url,p.github_url,p.release_url,p.published_at,
      p.maker_id,m.username as maker_username,m.display_name as maker_name,c.name as category,c.slug as category_slug,
      array(select t.name from public.project_technologies pt join public.technologies t on t.id=pt.technology_id where pt.project_id=p.id order by t.name) as stack,
      (select count(*) from public.upvotes v where v.project_id=p.id and private.is_active(v.user_id)) as upvote_count
    from public.projects p join public.profiles m on m.id=p.maker_id join public.categories c on c.id=p.category_id
    where p.status='published' and m.username is not null and private.is_active(m.id)
      and (p_maker is null or p.maker_id=p_maker)
      and (p_category is null or c.slug=p_category)
      and (coalesce(cardinality(p_stack),0)=0 or exists(select 1 from public.project_technologies pt join public.technologies t on t.id=pt.technology_id where pt.project_id=p.id and t.slug=any(p_stack)))
      -- strpos implements literal matching, including SQL wildcard characters.
      and (coalesce(p_query,'')='' or strpos(lower(p.name),lower(p_query))>0 or strpos(lower(m.username),lower(p_query))>0 or strpos(lower(m.display_name),lower(p_query))>0)
  )
  select s.* from summaries s
  where p_cursor is null or
    case when p_feed='popular' then (s.upvote_count,s.published_at,s.id)<((p_cursor->>'votes')::bigint,(p_cursor->>'published')::timestamptz,(p_cursor->>'id')::uuid)
    else (s.published_at,s.id)<((p_cursor->>'published')::timestamptz,(p_cursor->>'id')::uuid) end
  order by case when p_feed='popular' then s.upvote_count end desc,s.published_at desc,s.id desc
  limit greatest(1,least(coalesce(p_limit,20),21));
end;
$$;
revoke all on function public.list_projects(text,text,text[],text,jsonb,integer,uuid) from public;
grant execute on function public.list_projects(text,text,text[],text,jsonb,integer,uuid) to anon,authenticated;

create function public.search_makers(p_query text default '',p_limit integer default 20)
returns table(id uuid,username text,display_name text,bio text,github_username text,github_connected_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id,p.username,p.display_name,p.bio,p.github_username,p.github_connected_at,p.created_at
  from public.profiles p where p.username is not null and private.is_active(p.id)
    and char_length(p_query)<=100 and (strpos(lower(p.username),lower(p_query))>0 or strpos(lower(p.display_name),lower(p_query))>0)
  order by p.username limit greatest(1,least(coalesce(p_limit,20),20));
$$;
revoke all on function public.search_makers(text,integer) from public;
grant execute on function public.search_makers(text,integer) to anon,authenticated;

-- All project/social writes remain denied until their checked transactions exist.
commit;
