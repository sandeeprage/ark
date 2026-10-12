begin;

alter table public.projects add column launch_kind text not null default 'software' check(launch_kind in ('hosted','software'));
create table private.project_destinations (
  project_id uuid not null references public.projects(id) on delete cascade,
  maker_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  primary key(project_id,url), unique(maker_id,url)
);
create table private.upload_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  staging_key text not null unique, published_key text not null unique,
  declared_type text not null check(declared_type in ('image/png','image/jpeg','image/webp')),
  declared_bytes integer not null check(declared_bytes between 1 and 5242880),
  state text not null default 'reserved' check(state in ('reserved','processing','validated','consumed','rejected')),
  size_bytes integer check(size_bytes between 1 and 5242880),
  width integer check(width between 1 and 4096), height integer check(height between 1 and 4096),
  lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours'
);
create table private.rate_limits (
  subject_key text not null, action text not null, window_start timestamptz not null,
  count bigint not null check(count>=0), expires_at timestamptz not null,
  primary key(subject_key,action,window_start)
);
create table private.maintenance_jobs (
  id uuid primary key default gen_random_uuid(), dedupe_key text not null unique,
  type text not null check(type in ('media_cleanup','account_erasure')),
  payload jsonb not null, status text not null default 'pending' check(status in ('pending','running','completed','failed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease_until timestamptz, created_at timestamptz not null default now(), completed_at timestamptz,
  last_error_code text
);
create index maintenance_due on private.maintenance_jobs(status,next_attempt_at);
create index upload_assets_project on private.upload_assets(project_id,state);
alter table private.project_destinations enable row level security;
alter table private.upload_assets enable row level security;
alter table private.rate_limits enable row level security;
alter table private.maintenance_jobs enable row level security;
revoke all on private.project_destinations,private.upload_assets,private.rate_limits,private.maintenance_jobs from public,anon,authenticated;

create table public.profile_pins (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  position smallint not null check(position between 0 and 5),
  primary key(profile_id,project_id),unique(profile_id,position) deferrable initially deferred
);
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),primary key(follower_id,following_id),check(follower_id<>following_id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,type text not null check(type in ('follow','upvote','launch')),
  project_id uuid references public.projects(id) on delete cascade,dedupe_key text not null,
  created_at timestamptz not null default now(),read_at timestamptz,withdrawn_at timestamptz,
  unique(recipient_id,dedupe_key)
);
alter table public.profile_pins enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
create policy pins_read on public.profile_pins for select to anon,authenticated using(private.is_active(profile_id) and private.project_visible(project_id));
create policy follows_read on public.follows for select to anon,authenticated using(private.is_active(follower_id) and private.is_active(following_id));
create policy notifications_own_read on public.notifications for select to authenticated using(recipient_id=(select auth.uid()) and private.is_active(recipient_id));
revoke all on public.profile_pins,public.follows,public.notifications from public,anon,authenticated;
grant select on public.profile_pins,public.follows to anon,authenticated;
grant select on public.notifications to authenticated;
create index follows_target on public.follows(following_id,follower_id);
create index notifications_recipient on public.notifications(recipient_id,created_at desc,id desc);

create function private.require_maker() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); account_state text;
begin
  if actor is null then raise exception 'not_authenticated' using errcode='42501';end if;
  select status into account_state from private.account_controls where user_id=actor for update;
  if account_state is distinct from 'active' or not exists(select 1 from public.profiles where id=actor and username is not null) then raise exception 'forbidden' using errcode='42501';end if;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) and not exists(select 1 from auth.identities where user_id=actor and provider='github') then raise exception 'not_eligible' using errcode='42501';end if;
  return actor;
end;$$;

create function private.normalize_project_url(p_url text,p_github boolean default false) returns text language plpgsql immutable set search_path='' as $$
declare parts text[]; host text; suffix text; path text; query text;
begin
  if p_url is null or trim(p_url)='' then return null;end if;
  if char_length(p_url)>2000 or p_url ~ '[[:space:]]' then raise exception 'validation_failed' using errcode='22023';end if;
  parts:=regexp_match(p_url,'^https://([^/?#]+)([^#]*)');
  if parts is null then raise exception 'validation_failed' using errcode='22023';end if;
  host:=lower(parts[1]);suffix:=parts[2];
  if host !~ '^([a-z0-9][a-z0-9-]*\.)+[a-z0-9][a-z0-9-]*(:[0-9]{1,5})?$' or suffix ~ '[\\]' then raise exception 'validation_failed' using errcode='22023';end if;
  host:=regexp_replace(host,':443$','');
  path:=regexp_replace(split_part(suffix,'?',1),'/+$','');
  if p_github then
    if host<>'github.com' or path !~ '^/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$' then raise exception 'validation_failed' using errcode='22023';end if;
    return 'https://github.com'||regexp_replace(lower(path),'\.git$','');
  end if;
  query:=case when strpos(suffix,'?')>0 then substr(suffix,strpos(suffix,'?')) else '' end;
  return 'https://'||host||path||query;
end;$$;

create function private.apply_project_input(p_project uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare category uuid; stack uuid[]; live text; repo text; release text; video text; kind text;
begin
  if p_input->>'launch_confirmed' is distinct from 'true' then raise exception 'validation_failed' using errcode='22023';end if;
  category:=(p_input->>'category_id')::uuid;
  select array_agg(value::uuid) into stack from jsonb_array_elements_text(p_input->'technology_ids');
  if coalesce(cardinality(stack),0) not between 1 and 10 or (select count(distinct x) from unnest(stack)x)<>cardinality(stack) or
    (select count(*) from public.technologies where id=any(stack) and active)<>cardinality(stack) or not exists(select 1 from public.categories where id=category and active) then raise exception 'validation_failed' using errcode='22023';end if;
  live:=private.normalize_project_url(p_input->>'live_url');repo:=private.normalize_project_url(p_input->>'github_url',true);release:=private.normalize_project_url(p_input->>'release_url');video:=private.normalize_project_url(p_input->>'demo_video_url');kind:=p_input->>'launch_kind';
  if coalesce(live,repo,release) is null or kind is null or kind not in ('hosted','software') or
    ((kind='hosted' or exists(select 1 from public.categories where id=category and slug='web-apps')) and live is null) or
    (video is not null and video !~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)(/|\?|$)') then raise exception 'validation_failed' using errcode='22023';end if;
  update public.projects set name=trim(p_input->>'name'),tagline=trim(p_input->>'tagline'),description=trim(p_input->>'description'),launch_kind=kind,
    live_url=live,github_url=repo,release_url=release,demo_video_url=video,category_id=category,updated_at=now() where id=p_project;
  delete from private.project_destinations where project_id=p_project;
  insert into private.project_destinations(project_id,maker_id,url) select p_project,p.maker_id,u from public.projects p cross join (select distinct unnest(array[live,repo,release]) u) urls where p.id=p_project and u is not null;
  delete from public.project_technologies where project_id=p_project;
  insert into public.project_technologies(project_id,technology_id) select p_project,unnest(stack);
end;$$;

create function public.prepare_project(p_request_key uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); project public.projects;
begin
  if p_request_key is null then raise exception 'validation_failed' using errcode='22023';end if;
  select * into project from public.projects where maker_id=actor and publish_request_key=p_request_key::text for update;
  if found then
    if project.status='published' then return jsonb_build_object('id',project.id,'version',project.version,'status',project.status);end if;
    if project.status<>'draft' or project.created_at<now()-interval '24 hours' then raise exception 'unavailable' using errcode='22023';end if;
  else
    insert into public.projects(maker_id,name,tagline,description,release_url,category_id,publish_request_key)
    values(actor,trim(p_input->>'name'),trim(p_input->>'tagline'),trim(p_input->>'description'),coalesce(private.normalize_project_url(p_input->>'live_url'),private.normalize_project_url(p_input->>'release_url'),private.normalize_project_url(p_input->>'github_url',true)),(p_input->>'category_id')::uuid,p_request_key::text) returning * into project;
  end if;
  perform private.apply_project_input(project.id,p_input);
  update public.projects set version=version+1 where id=project.id returning version into project.version;
  return jsonb_build_object('id',project.id,'version',project.version,'status','draft');
end;$$;
revoke all on function public.prepare_project(uuid,jsonb) from public,anon;
grant execute on function public.prepare_project(uuid,jsonb) to authenticated;

create function public.reserve_project_upload(p_project uuid,p_type text,p_size integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); asset uuid:=gen_random_uuid(); stage text; published text; daily bigint; quota_window timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
  if not exists(select 1 from public.projects where id=p_project and maker_id=actor and status in ('draft','published','hidden')) then raise exception 'forbidden' using errcode='42501';end if;
  if p_type is null or p_type not in ('image/png','image/jpeg','image/webp') or p_size is null or p_size not between 1 and 5242880 then raise exception 'validation_failed' using errcode='22023';end if;
  if (select count(*) from private.upload_assets where project_id=p_project and state in ('reserved','processing','validated') and expires_at>now())>=8 then raise exception 'upload_limit' using errcode='22023';end if;
  insert into private.rate_limits(subject_key,action,window_start,count,expires_at) values(actor::text,'upload_bytes',quota_window,p_size,quota_window+interval '2 days')
  on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+excluded.count returning count into daily;
  if daily>104857600 then raise exception 'rate_limited' using errcode='P0001';end if;
  stage:=actor::text||'/'||p_project::text||'/'||asset::text;published:=stage||'.webp';
  insert into private.upload_assets(id,project_id,owner_id,staging_key,published_key,declared_type,declared_bytes) values(asset,p_project,actor,stage,published,p_type,p_size);
  insert into private.maintenance_jobs(dedupe_key,type,payload,next_attempt_at) values('upload:'||asset::text,'media_cleanup',jsonb_build_object('objects',jsonb_build_array(jsonb_build_object('bucket','ark-staging','key',stage),jsonb_build_object('bucket','ark-media','key',published))),now()+interval '24 hours');
  return jsonb_build_object('id',asset,'staging_key',stage);
end;$$;
revoke all on function public.reserve_project_upload(uuid,text,integer) from public,anon;
grant execute on function public.reserve_project_upload(uuid,text,integer) to authenticated;

create function public.get_my_upload(p_asset uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare asset private.upload_assets;
begin
  if auth.uid() is null or not private.is_active(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
  select * into asset from private.upload_assets where id=p_asset and owner_id=auth.uid() and expires_at>now();
  if not found then raise exception 'unavailable' using errcode='42501';end if;
  return to_jsonb(asset);
end;$$;
revoke all on function public.get_my_upload(uuid) from public,anon;
grant execute on function public.get_my_upload(uuid) to authenticated;

-- These maintenance/validation functions are executable only with a server secret.
-- They derive the owner and paths from an existing reservation, not caller metadata.
create function public.claim_media_validation(p_asset uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare asset private.upload_assets; token uuid:=gen_random_uuid();
begin
  select * into asset from private.upload_assets where id=p_asset for update;
  if not found or not private.is_active(asset.owner_id) or asset.expires_at<=now() or not exists(select 1 from public.projects where id=asset.project_id and maker_id=asset.owner_id and status in ('draft','published','hidden')) then raise exception 'unavailable' using errcode='22023';end if;
  if asset.state in ('validated','consumed') then return to_jsonb(asset);end if;
  if asset.state='processing' and asset.lease_until>now() then raise exception 'conflict' using errcode='40001';end if;
  if asset.state='rejected' then raise exception 'unavailable' using errcode='22023';end if;
  update private.upload_assets set state='processing',lease_token=token,lease_until=now()+interval '2 minutes' where id=p_asset returning * into asset;
  return to_jsonb(asset);
end;$$;
create function public.complete_media_validation(p_asset uuid,p_token uuid,p_size integer,p_width integer,p_height integer) returns void language plpgsql security definer set search_path='' as $$
begin
  update private.upload_assets set state='validated',size_bytes=p_size,width=p_width,height=p_height,lease_until=null
  where id=p_asset and state='processing' and lease_token=p_token and expires_at>now() and private.is_active(owner_id);
  if not found then raise exception 'conflict' using errcode='40001';end if;
end;$$;
create function public.reject_media_validation(p_asset uuid,p_token uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update private.upload_assets set state='rejected',lease_until=null where id=p_asset and state='processing' and lease_token=p_token;
  if found then update private.maintenance_jobs set next_attempt_at=(select greatest(now(),created_at+interval '2 hours') from private.upload_assets where id=p_asset) where dedupe_key='upload:'||p_asset::text and status='pending';end if;
end;$$;
revoke all on function public.claim_media_validation(uuid),public.complete_media_validation(uuid,uuid,integer,integer,integer),public.reject_media_validation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_media_validation(uuid),public.complete_media_validation(uuid,uuid,integer,integer,integer),public.reject_media_validation(uuid,uuid) to service_role;

create function public.discard_project_upload(p_asset uuid) returns void language plpgsql security definer set search_path='' as $$
declare asset private.upload_assets;
begin
  if auth.uid() is null or not private.is_active(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
  select * into asset from private.upload_assets where id=p_asset and owner_id=auth.uid() for update;
  if not found then raise exception 'forbidden' using errcode='42501';end if;
  if asset.state='consumed' then return;end if;
  update private.upload_assets set state='rejected',lease_until=null where id=p_asset;
  update private.maintenance_jobs set next_attempt_at=greatest(now(),asset.created_at+interval '2 hours') where dedupe_key='upload:'||p_asset::text and status='pending';
end;$$;
revoke all on function public.discard_project_upload(uuid) from public,anon;
grant execute on function public.discard_project_upload(uuid) to authenticated;

create function private.replace_project_media(p_project uuid,p_ids uuid[],p_alt text[],p_cover uuid) returns void language plpgsql security definer set search_path='' as $$
declare selected jsonb; image jsonb; position integer; owner uuid;
begin
  select maker_id into owner from public.projects where id=p_project;
  if owner is distinct from auth.uid() or coalesce(cardinality(p_ids),0) not between 1 and 8 or cardinality(p_alt)<>cardinality(p_ids) or (select count(distinct x) from unnest(p_ids)x)<>cardinality(p_ids) or p_cover is null or not(p_cover=any(p_ids)) or exists(select 1 from unnest(p_alt)x where x is null or char_length(trim(x)) not between 1 and 500) then raise exception 'validation_failed' using errcode='22023';end if;
  -- Serialize against expiry/cancellation so cleanup cannot remove a newly adopted image.
  perform 1 from private.upload_assets where id=any(p_ids) and project_id=p_project order by id for update;
  select jsonb_agg(to_jsonb(images)) into selected from (
    select m.id,m.object_key,m.size_bytes,m.width,m.height from public.project_media m where m.project_id=p_project and m.id=any(p_ids) and m.state='ready'
    union all select a.id,a.published_key,a.size_bytes,a.width,a.height from private.upload_assets a where a.project_id=p_project and a.owner_id=owner and a.id=any(p_ids) and a.state='validated' and a.expires_at>now()
  ) images;
  if coalesce(jsonb_array_length(selected),0)<>cardinality(p_ids) then raise exception 'media_not_ready' using errcode='22023';end if;
  insert into private.maintenance_jobs(dedupe_key,type,payload)
  select 'removed-media:'||m.id::text,'media_cleanup',jsonb_build_object('objects',jsonb_build_array(jsonb_build_object('bucket','ark-media','key',m.object_key))) from public.project_media m where m.project_id=p_project and not(m.id=any(p_ids)) on conflict(dedupe_key) do nothing;
  delete from public.project_media where project_id=p_project;
  for position in 1..cardinality(p_ids) loop
    select value into image from jsonb_array_elements(selected) where (value->>'id')::uuid=p_ids[position];
    insert into public.project_media(id,project_id,object_key,mime_type,size_bytes,width,height,alt_text,position,state)
    values(p_ids[position],p_project,image->>'object_key','image/webp',(image->>'size_bytes')::integer,(image->>'width')::integer,(image->>'height')::integer,trim(p_alt[position]),position-1,'ready');
  end loop;
  update public.projects set cover_media_id=p_cover where id=p_project;
  update private.upload_assets set state='consumed' where id=any(p_ids) and project_id=p_project and state='validated';
end;$$;

create function public.publish_project(p_project uuid,p_expected_version integer,p_ids uuid[],p_alt text[],p_cover uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); project public.projects;
begin
  select * into project from public.projects where id=p_project and maker_id=actor for update;
  if not found then raise exception 'forbidden' using errcode='42501';end if;
  if project.status='published' then return project.id;end if;
  if project.status<>'draft' or project.created_at<now()-interval '24 hours' then raise exception 'unavailable' using errcode='22023';end if;
  if project.version is distinct from p_expected_version then raise exception 'conflict' using errcode='40001';end if;
  if (select count(*) from public.projects where maker_id=actor and published_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=5 then raise exception 'rate_limited' using errcode='P0001';end if;
  perform private.replace_project_media(p_project,p_ids,p_alt,p_cover);
  update public.projects set status='published',published_at=now(),updated_at=now(),version=version+1 where id=p_project;
  insert into public.notifications(recipient_id,actor_id,type,project_id,dedupe_key)
  select f.follower_id,actor,'launch',p_project,'launch:'||p_project::text from public.follows f join private.account_settings s on s.user_id=f.follower_id where f.following_id=actor and s.notify_launches and private.is_active(f.follower_id)
  on conflict(recipient_id,dedupe_key) do nothing;
  return p_project;
end;$$;
revoke all on function public.publish_project(uuid,integer,uuid[],text[],uuid) from public,anon;
grant execute on function public.publish_project(uuid,integer,uuid[],text[],uuid) to authenticated;

create function public.edit_project(p_project uuid,p_expected_version integer,p_input jsonb,p_ids uuid[],p_alt text[],p_cover uuid) returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); project public.projects; next_version integer;
begin
  select * into project from public.projects where id=p_project and maker_id=actor for update;
  if not found then raise exception 'forbidden' using errcode='42501';end if;
  if project.status not in ('published','hidden') then raise exception 'unavailable' using errcode='22023';end if;
  if project.version is distinct from p_expected_version then raise exception 'conflict' using errcode='40001';end if;
  perform private.apply_project_input(p_project,p_input);
  perform private.replace_project_media(p_project,p_ids,p_alt,p_cover);
  update public.projects set version=version+1,updated_at=now() where id=p_project returning version into next_version;
  return next_version;
end;$$;
revoke all on function public.edit_project(uuid,integer,jsonb,uuid[],text[],uuid) from public,anon;
grant execute on function public.edit_project(uuid,integer,jsonb,uuid[],text[],uuid) to authenticated;

create function public.get_my_project(p_project uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare project public.projects;
begin
  if auth.uid() is null or not private.is_active(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
  select * into project from public.projects where id=p_project and maker_id=auth.uid();
  if not found then return null;end if;
  return jsonb_build_object('project',to_jsonb(project),'media',coalesce((select jsonb_agg(to_jsonb(m) order by position) from public.project_media m where project_id=p_project and state='ready'),'[]'::jsonb),'technology_ids',coalesce((select jsonb_agg(technology_id) from public.project_technologies where project_id=p_project),'[]'::jsonb),'pinned',exists(select 1 from public.profile_pins where profile_id=auth.uid() and project_id=p_project));
end;$$;
revoke all on function public.get_my_project(uuid) from public,anon;
grant execute on function public.get_my_project(uuid) to authenticated;

create function public.delete_project(p_project uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); project public.projects;
begin
  select * into project from public.projects where id=p_project and maker_id=actor for update;
  if not found then raise exception 'forbidden' using errcode='42501';end if;
  if project.name is distinct from p_name then raise exception 'validation_failed' using errcode='22023';end if;
  if project.status='deleted' then return;end if;
  insert into private.maintenance_jobs(dedupe_key,type,payload,next_attempt_at) values('project-delete:'||p_project::text,'media_cleanup',jsonb_build_object('objects',coalesce((select jsonb_agg(jsonb_build_object('bucket','ark-media','key',object_key)) from public.project_media where project_id=p_project),'[]'::jsonb)),now()) on conflict(dedupe_key) do nothing;
  update public.projects set status='deleted',deleted_at=now(),updated_at=now(),version=version+1 where id=p_project;
  delete from private.project_destinations where project_id=p_project;
  delete from public.profile_pins where project_id=p_project;
  update public.notifications set withdrawn_at=now() where project_id=p_project and withdrawn_at is null;
end;$$;
revoke all on function public.delete_project(uuid,text) from public,anon;
grant execute on function public.delete_project(uuid,text) to authenticated;

create function public.set_profile_pin(p_project uuid,p_desired boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); slot integer;
begin
  if not exists(select 1 from public.projects where id=p_project and maker_id=actor and status='published') then raise exception 'forbidden' using errcode='42501';end if;
  if p_desired then
    if exists(select 1 from public.profile_pins where profile_id=actor and project_id=p_project) then return;end if;
    select n into slot from generate_series(0,5)n where not exists(select 1 from public.profile_pins where profile_id=actor and position=n) order by n limit 1;
    if slot is null then raise exception 'pin_limit' using errcode='22023';end if;
    insert into public.profile_pins(profile_id,project_id,position) values(actor,p_project,slot);
  else delete from public.profile_pins where profile_id=actor and project_id=p_project;end if;
end;$$;
revoke all on function public.set_profile_pin(uuid,boolean) from public,anon;
grant execute on function public.set_profile_pin(uuid,boolean) to authenticated;

create function public.get_visible_project_media(p_projects uuid[],p_covers_only boolean default false)
returns table(id uuid,project_id uuid,object_key text,alt_text text,width integer,height integer,"position" smallint,is_cover boolean)
language sql stable security definer set search_path='' as $$
  select m.id,m.project_id,m.object_key,m.alt_text,m.width,m.height,m.position,m.id=p.cover_media_id from public.project_media m join public.projects p on p.id=m.project_id
  where cardinality(p_projects)<=20 and m.project_id=any(p_projects) and m.state='ready' and private.project_visible(m.project_id) and (not p_covers_only or m.id=p.cover_media_id) order by m.project_id,m.position;
$$;
revoke all on function public.get_visible_project_media(uuid[],boolean) from public,anon,authenticated;
grant execute on function public.get_visible_project_media(uuid[],boolean) to service_role;

-- Shared helpers must never become alternate public mutation endpoints.
revoke all on function private.require_maker(),private.normalize_project_url(text,boolean),private.apply_project_input(uuid,jsonb),private.replace_project_media(uuid,uuid[],text[],uuid) from public,anon,authenticated;
commit;

