begin;

alter table public.profiles add column avatar_updated_at timestamptz;

create function public.get_public_profile_details(p_username text)
returns table(id uuid,username text,display_name text,bio text,github_username text,github_connected_at timestamptz,created_at timestamptz,has_avatar boolean,avatar_version timestamptz)
language sql stable security invoker set search_path='' as $$
 select p.id,p.username,p.display_name,p.bio,p.github_username,p.github_connected_at,p.created_at,
 p.avatar_object_key is not null,p.avatar_updated_at
 from public.profiles p where p.username=p_username and private.is_active(p.id);
$$;
revoke all on function public.get_public_profile_details(text) from public;
grant execute on function public.get_public_profile_details(text) to anon,authenticated;

create function public.set_profile_avatar(p_actor uuid,p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 perform 1 from private.account_controls where user_id=p_actor for update;
 if not private.is_active(p_actor) then raise exception 'forbidden' using errcode='42501';end if;
 if p_key is not null and p_key !~ ('^avatars/'||p_actor::text||'/[0-9a-f-]{36}\.webp$') then raise exception 'invalid_avatar' using errcode='22023';end if;
 select avatar_object_key into previous from public.profiles where id=p_actor for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 update public.profiles set avatar_object_key=p_key,avatar_updated_at=now(),updated_at=now() where id=p_actor;
 if previous is not null and previous is distinct from p_key then
  insert into private.maintenance_jobs(dedupe_key,type,payload) values('avatar-retire:'||previous,'media_cleanup',jsonb_build_object('objects',jsonb_build_array(jsonb_build_object('bucket','ark-avatars','key',previous)))) on conflict(dedupe_key) do nothing;
 end if;
end;$$;
revoke all on function public.set_profile_avatar(uuid,text) from public,anon,authenticated;
grant execute on function public.set_profile_avatar(uuid,text) to service_role;
create function public.reserve_profile_avatar(p_actor uuid,p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare used bigint; quota_window timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 perform 1 from private.account_controls where user_id=p_actor for update;
 if not private.is_active(p_actor) then raise exception 'forbidden' using errcode='42501';end if;
 if p_key is null or p_key !~ ('^avatars/'||p_actor::text||'/[0-9a-f-]{36}\.webp$') then raise exception 'invalid_avatar' using errcode='22023';end if;
 insert into private.rate_limits(subject_key,action,window_start,count,expires_at) values(p_actor::text,'avatar_upload',quota_window,1,quota_window+interval '2 days') on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+1 returning count into used;
 if used>20 then raise exception 'rate_limited' using errcode='P0001';end if;
 insert into private.maintenance_jobs(dedupe_key,type,payload,next_attempt_at) values('avatar-reserve:'||p_key,'media_cleanup',jsonb_build_object('objects',jsonb_build_array(jsonb_build_object('bucket','ark-avatars','key',p_key))),now()+interval '24 hours');
end;$$;
revoke all on function public.reserve_profile_avatar(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_profile_avatar(uuid,text) to service_role;

create or replace function public.media_job_objects(p_job uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare objects jsonb;
begin
 update private.upload_assets a set state='rejected',lease_until=null where a.expires_at<=now() and a.state in ('reserved','processing','validated') and exists(select 1 from private.maintenance_jobs j cross join lateral jsonb_array_elements(j.payload->'objects') obj where j.id=p_job and j.status='running' and obj->>'key'=a.published_key);
 select coalesce(jsonb_agg(obj),'[]'::jsonb) into objects from private.maintenance_jobs j cross join lateral jsonb_array_elements(j.payload->'objects') obj
 where j.id=p_job and j.type='media_cleanup' and j.status='running' and
 (obj->>'bucket'='ark-staging' or
 (obj->>'bucket'='ark-media' and not exists(select 1 from public.project_media m join public.projects p on p.id=m.project_id where m.object_key=obj->>'key' and m.state='ready' and p.status<>'deleted')) or
 (obj->>'bucket'='ark-avatars' and not exists(select 1 from public.profiles p where p.avatar_object_key=obj->>'key')));
 return objects;
end;$$;

create function public.request_my_account_erasure(p_confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); expected text; objects jsonb;
begin
 if actor is null then raise exception 'forbidden' using errcode='42501';end if;
 perform 1 from private.account_controls where user_id=actor for update;
 if not found then raise exception 'forbidden' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=actor and last_sign_in_at>now()-interval '10 minutes') then raise exception 'recent_sign_in_required' using errcode='42501';end if;
 select coalesce(username,'DELETE') into expected from public.profiles where id=actor;
 if p_confirmation is distinct from expected then raise exception 'confirmation_required' using errcode='22023';end if;
 select coalesce(jsonb_agg(distinct jsonb_build_object('bucket',bucket,'key',key)),'[]'::jsonb) into objects from (
  select 'ark-media' as bucket,m.object_key as key from public.project_media m join public.projects p on p.id=m.project_id where p.maker_id=actor
  union all select 'ark-staging',a.staging_key from private.upload_assets a where a.owner_id=actor
  union all select 'ark-media',a.published_key from private.upload_assets a where a.owner_id=actor
  union all select 'ark-avatars',p.avatar_object_key from public.profiles p where p.id=actor and p.avatar_object_key is not null
  union all select obj->>'bucket',obj->>'key' from private.maintenance_jobs j cross join lateral jsonb_array_elements(j.payload->'objects') obj
   where j.type='media_cleanup' and obj->>'bucket'='ark-avatars' and obj->>'key' like 'avatars/'||actor::text||'/%'
 ) owned;
 insert into private.maintenance_jobs(dedupe_key,type,payload) values('account-erase:'||actor::text,'account_erasure',jsonb_build_object('user_id',actor,'objects',objects)) on conflict(dedupe_key) do nothing;
 update private.content_reports set details='[Removed following account deletion]',reporter_id=case when reporter_id=actor then null else reporter_id end where reporter_id=actor or (target_kind='maker' and target_id=actor) or (target_kind='project' and target_id in (select id from public.projects where maker_id=actor));
 update private.moderation_audit set reason='Account deleted; personal details removed.' where actor_id=actor or (target_kind='maker' and target_id=actor) or (target_kind='project' and target_id in (select id from public.projects where maker_id=actor));
 update private.account_controls set status='deleting' where user_id=actor;
end;$$;
revoke all on function public.request_my_account_erasure(text) from public,anon;
grant execute on function public.request_my_account_erasure(text) to authenticated;

create function public.claim_account_erasure_jobs(p_limit integer default 5) returns setof jsonb
language plpgsql security definer set search_path='' as $$
declare job private.maintenance_jobs;
begin
 for job in select * from private.maintenance_jobs where type='account_erasure' and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<now())) order by next_attempt_at for update skip locked limit greatest(1,least(p_limit,5)) loop
  update private.maintenance_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '5 minutes' where id=job.id returning * into job;
  return next to_jsonb(job);
 end loop;
end;$$;
create function public.finish_account_erasure(p_job uuid,p_attempt integer,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$
declare job private.maintenance_jobs;
begin
 select * into job from private.maintenance_jobs where id=p_job and type='account_erasure' and status='running' and attempts=p_attempt for update;
 if not found then raise exception 'stale_attempt' using errcode='40001';end if;
 if p_success and exists(select 1 from auth.users where id=(job.payload->>'user_id')::uuid) then raise exception 'account_still_exists' using errcode='40001';end if;
 update private.maintenance_jobs set status=case when p_success then 'completed' else 'failed' end,
 completed_at=case when p_success then now() else null end,lease_until=null,
 next_attempt_at=now()+make_interval(mins=>least(1440,power(2,least(attempts,10))::integer)),
 last_error_code=case when p_success then null else 'account_cleanup_failed' end,
 payload=case when p_success then '{}'::jsonb else payload end,
 dedupe_key=case when p_success then 'erased:'||id::text else dedupe_key end where id=p_job;
end;$$;
revoke all on function public.claim_account_erasure_jobs(integer),public.finish_account_erasure(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.claim_account_erasure_jobs(integer),public.finish_account_erasure(uuid,integer,boolean) to service_role;

create table private.content_reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid references public.profiles(id) on delete set null,
 target_kind text not null check(target_kind in ('project','maker')),target_id uuid not null,
 reason text not null check(reason in ('spam','harassment','unsafe','rights','other')),
 details text not null check(char_length(details) between 10 and 2000),
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 created_at timestamptz not null default now(),resolved_at timestamptz
);
create index reports_open on private.content_reports(status,created_at);
create unique index reports_one_open on private.content_reports(reporter_id,target_kind,target_id) where status='open' and reporter_id is not null;
create table private.moderation_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,
 target_kind text not null,target_id uuid not null,action text not null,reason text not null,
 report_id uuid references private.content_reports(id) on delete set null,before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now()
);
alter table private.content_reports enable row level security;
alter table private.moderation_audit enable row level security;
revoke all on private.content_reports,private.moderation_audit from public,anon,authenticated;

create function private.is_admin(p_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_active(p_actor) and exists(select 1 from private.user_roles where user_id=p_actor and role='admin');
$$;
revoke all on function private.is_admin(uuid) from public,anon,authenticated;
create function public.my_admin_access() returns boolean
language sql stable security definer set search_path='' as $$ select private.is_admin(auth.uid());$$;
revoke all on function public.my_admin_access() from public,anon;
grant execute on function public.my_admin_access() to authenticated;

create function public.report_content(p_kind text,p_target uuid,p_reason text,p_details text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); report uuid;
begin
 if p_kind not in ('project','maker') or p_reason not in ('spam','harassment','unsafe','rights','other') or p_kind is null or p_reason is null or p_details is null or char_length(trim(p_details)) not between 10 and 2000 then raise exception 'invalid_report' using errcode='22023';end if;
 if p_kind='project' then
  if not private.project_visible(p_target) or exists(select 1 from public.projects where id=p_target and maker_id=actor) then raise exception 'forbidden' using errcode='42501';end if;
 else
  if actor=p_target or not exists(select 1 from public.profiles where id=p_target and username is not null and private.is_active(id)) then raise exception 'forbidden' using errcode='42501';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':reports',0));
 if (select count(*) from private.content_reports where reporter_id=actor and created_at>now()-interval '1 day')>=5 then raise exception 'report_limit' using errcode='P0001';end if;
 if exists(select 1 from private.content_reports where reporter_id=actor and target_kind=p_kind and target_id=p_target and status='open') then raise exception 'already_reported' using errcode='23505';end if;
 insert into private.content_reports(reporter_id,target_kind,target_id,reason,details) values(actor,p_kind,p_target,p_reason,trim(p_details)) returning id into report;
 return report;
end;$$;
revoke all on function public.report_content(text,uuid,text,text) from public,anon;
grant execute on function public.report_content(text,uuid,text,text) to authenticated;

create function public.list_content_reports(p_after timestamptz default null,p_after_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
 if (p_after is null)<>(p_after_id is null) then raise exception 'invalid_cursor' using errcode='22023';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select * from private.content_reports where p_after is null or (created_at,id)<(p_after,p_after_id) order by created_at desc,id desc limit 51) r);
end;$$;
create function public.moderate_report(p_report uuid,p_action text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); report private.content_reports; previous_status text; next_status text;
begin
 if not private.is_admin(actor) then raise exception 'forbidden' using errcode='42501';end if;
 if p_action is null or p_action not in ('dismiss','hide','restore','suspend','reinstate') or p_reason is null or char_length(trim(p_reason)) not between 10 and 2000 then raise exception 'invalid_moderation' using errcode='22023';end if;
 select * into report from private.content_reports where id=p_report for update;
 if not found then raise exception 'missing_report' using errcode='22023';end if;
 if p_action in ('hide','restore') and report.target_kind='project' then
  select status into previous_status from public.projects where id=report.target_id for update;
  next_status:=case when p_action='hide' then 'hidden' else 'published' end;
  update public.projects set status=case when p_action='hide' then 'hidden' else 'published' end,updated_at=now(),version=version+1 where id=report.target_id and status in ('published','hidden');
  if not found then raise exception 'project_unavailable' using errcode='22023';end if;
 elsif p_action in ('suspend','reinstate') and report.target_kind='maker' then
  if actor=report.target_id or exists(select 1 from private.user_roles where user_id=report.target_id and role='admin') then raise exception 'protected_admin' using errcode='42501';end if;
  select status into previous_status from private.account_controls where user_id=report.target_id for update;
  next_status:=case when p_action='suspend' then 'suspended' else 'active' end;
  update private.account_controls set status=next_status,
   suspended_at=case when p_action='suspend' then now() else null end,suspended_by=case when p_action='suspend' then actor else null end,
   suspension_reason=case when p_action='suspend' then trim(p_reason) else null end where user_id=report.target_id and status in ('active','suspended');
  if not found then raise exception 'account_unavailable' using errcode='22023';end if;
 elsif p_action<>'dismiss' then raise exception 'invalid_target_action' using errcode='22023';
 else previous_status:=report.status;next_status:='dismissed';end if;
 update private.content_reports set status=case when p_action='dismiss' then 'dismissed' else 'resolved' end,resolved_at=now() where id=p_report;
 insert into private.moderation_audit(actor_id,target_kind,target_id,action,reason,report_id,before_state,after_state) values(actor,report.target_kind,report.target_id,p_action,trim(p_reason),p_report,jsonb_build_object('status',previous_status),jsonb_build_object('status',next_status));
end;$$;
create function public.list_moderation_audit() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from (select * from private.moderation_audit order by created_at desc,id desc limit 50) a);
end;$$;
revoke all on function public.list_content_reports(timestamptz,uuid),public.moderate_report(uuid,text,text),public.list_moderation_audit() from public,anon;
grant execute on function public.list_content_reports(timestamptz,uuid),public.moderate_report(uuid,text,text),public.list_moderation_audit() to authenticated;

create function public.get_my_report_statuses() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_maker();
begin
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select id,target_kind,reason,status,created_at from private.content_reports where reporter_id=actor order by created_at desc,id desc limit 10) r);
end;$$;
revoke all on function public.get_my_report_statuses() from public,anon;
grant execute on function public.get_my_report_statuses() to authenticated;
create function public.purge_moderation_records() returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from private.content_reports where created_at<now()-interval '90 days';
 delete from private.moderation_audit where created_at<now()-interval '90 days';
end;$$;
revoke all on function public.purge_moderation_records() from public,anon,authenticated;
grant execute on function public.purge_moderation_records() to service_role;

commit;
