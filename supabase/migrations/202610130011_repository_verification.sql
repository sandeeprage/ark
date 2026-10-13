begin;

create table private.repository_verifications (
  project_id uuid primary key references public.projects(id) on delete cascade,
  identity_id uuid not null references auth.identities(id) on delete cascade,
  github_user_id bigint not null check(github_user_id>0),
  repository_id bigint check(repository_id>0),
  repository_url text not null,
  project_version integer not null,
  state text not null default 'unverified' check(state in ('verified','unverified')),
  checked_at timestamptz,
  expires_at timestamptz,
  invalidated_at timestamptz,
  attempt_id uuid not null,
  attempt_until timestamptz not null,
  check(state<>'verified' or (repository_id is not null and checked_at is not null and expires_at>checked_at))
);
alter table private.repository_verifications enable row level security;
revoke all on private.repository_verifications from public,anon,authenticated;

create function private.invalidate_repository_verification() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.github_url is distinct from old.github_url or new.status is distinct from old.status then
  update private.repository_verifications set state='unverified',invalidated_at=now(),attempt_until=now()
  where project_id=new.id;
 end if;
 return new;
end;$$;
revoke all on function private.invalidate_repository_verification() from public,anon,authenticated;
create trigger invalidate_repository_verification after update of github_url,status on public.projects
for each row execute function private.invalidate_repository_verification();

create function public.begin_repository_verification(p_project uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); p public.projects; i auth.identities;
 used bigint; hour_start timestamptz:=date_trunc('hour',now()); attempt uuid:=gen_random_uuid();
begin
 select * into p from public.projects where id=p_project and maker_id=actor for update;
 if not found or p.status<>'published' then raise exception 'forbidden' using errcode='42501';end if;
 if p.github_url is null then raise exception 'repository_required' using errcode='22023';end if;
 select * into i from auth.identities where user_id=actor and provider='github' limit 1;
 if not found or i.provider_id !~ '^[1-9][0-9]{0,17}$' then raise exception 'github_required' using errcode='22023';end if;
 insert into private.rate_limits(subject_key,action,window_start,count,expires_at)
 values(actor::text,'repository_verification',hour_start,1,hour_start+interval '2 hours')
 on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+1 returning count into used;
 if used>10 then raise exception 'rate_limited' using errcode='P0001';end if;
 insert into private.repository_verifications(project_id,identity_id,github_user_id,repository_url,project_version,attempt_id,attempt_until)
 values(p.id,i.id,i.provider_id::bigint,p.github_url,p.version,attempt,now()+interval '30 seconds')
 on conflict(project_id) do update set identity_id=excluded.identity_id,github_user_id=excluded.github_user_id,
 repository_url=excluded.repository_url,project_version=excluded.project_version,state='unverified',
 invalidated_at=now(),attempt_id=excluded.attempt_id,attempt_until=excluded.attempt_until;
 return jsonb_build_object('url',p.github_url,'github_user_id',i.provider_id,'attempt_id',attempt);
end;$$;
revoke all on function public.begin_repository_verification(uuid) from public,anon;
grant execute on function public.begin_repository_verification(uuid) to authenticated;

-- Only the application server can attest to a GitHub API response. The random,
-- short-lived attempt binds that response to an authorized maker and exact edit.
create function public.complete_repository_verification(p_project uuid,p_attempt uuid,p_repository_id bigint,p_owner_id bigint,p_repository_url text)
returns boolean language plpgsql security definer set search_path='' as $$
declare p public.projects; v private.repository_verifications;
begin
 select * into p from public.projects where id=p_project for update;
 if not found or p.status<>'published' or not private.is_active(p.maker_id) then return false;end if;
 select * into v from private.repository_verifications where project_id=p.id for update;
 if not found or v.attempt_id is distinct from p_attempt or v.attempt_until<=now()
 or v.project_version<>p.version or v.repository_url is distinct from p.github_url
 or p_repository_url is distinct from p.github_url or p_repository_id is null or p_repository_id<=0
 or p_owner_id is distinct from v.github_user_id
 or not exists(select 1 from auth.identities where id=v.identity_id and user_id=p.maker_id and provider='github' and provider_id=v.github_user_id::text)
 then return false;end if;
 update private.repository_verifications set state='verified',repository_id=p_repository_id,
 checked_at=now(),expires_at=now()+interval '90 days',invalidated_at=null,attempt_until=now() where project_id=p.id;
 return true;
end;$$;
revoke all on function public.complete_repository_verification(uuid,uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_repository_verification(uuid,uuid,bigint,bigint,text) to service_role;

create function public.get_public_repository_verification(p_project uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state',case when v.expires_at<=now() then 'expired' else 'verified' end,
 'checked_at',v.checked_at,'expires_at',v.expires_at)
 from private.repository_verifications v join public.projects p on p.id=v.project_id
 where p.id=p_project and private.project_visible(p.id) and v.state='verified'
 and v.invalidated_at is null and v.repository_url=p.github_url
 and exists(select 1 from auth.identities i where i.id=v.identity_id and i.user_id=p.maker_id
 and i.provider='github' and i.provider_id=v.github_user_id::text);
$$;
revoke all on function public.get_public_repository_verification(uuid) from public;
grant execute on function public.get_public_repository_verification(uuid) to anon,authenticated;
commit;
