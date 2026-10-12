begin;
create function public.claim_media_jobs(p_limit integer default 10) returns setof jsonb language plpgsql security definer set search_path='' as $$
declare job private.maintenance_jobs;
begin
  -- Expire abandoned technical drafts before orphan jobs examine their references.
  update public.projects set status='deleted',deleted_at=now(),updated_at=now() where status='draft' and created_at<now()-interval '24 hours';
  delete from private.project_destinations d using public.projects p where d.project_id=p.id and p.status='deleted';
  for job in select * from private.maintenance_jobs where type='media_cleanup' and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<now())) order by next_attempt_at for update skip locked limit greatest(1,least(p_limit,20)) loop
    update private.maintenance_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '5 minutes' where id=job.id returning * into job;
    return next to_jsonb(job);
  end loop;
end;$$;
create function public.media_job_objects(p_job uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare objects jsonb;
begin
  update private.upload_assets a set state='rejected',lease_until=null where a.expires_at<=now() and a.state in ('reserved','processing','validated') and exists(select 1 from private.maintenance_jobs j cross join lateral jsonb_array_elements(j.payload->'objects') obj where j.id=p_job and j.status='running' and obj->>'key'=a.published_key);
  select coalesce(jsonb_agg(obj),'[]'::jsonb) into objects from private.maintenance_jobs j cross join lateral jsonb_array_elements(j.payload->'objects') obj
  where j.id=p_job and j.type='media_cleanup' and j.status='running' and
    (obj->>'bucket'='ark-staging' or (obj->>'bucket'='ark-media' and not exists(select 1 from public.project_media m join public.projects p on p.id=m.project_id where m.object_key=obj->>'key' and m.state='ready' and p.status<>'deleted')));
  return objects;
end;$$;
create function public.finish_media_job(p_job uuid,p_attempt integer,p_success boolean,p_code text default null) returns void language plpgsql security definer set search_path='' as $$
begin
  update private.maintenance_jobs set status=case when p_success then 'completed' else 'failed' end,
    completed_at=case when p_success then now() else null end,lease_until=null,last_error_code=case when p_success then null else left(p_code,80) end,
    next_attempt_at=now()+make_interval(mins=>least(1440,power(2,least(attempts,10))::integer))
  where id=p_job and status='running' and attempts=p_attempt;
end;$$;
revoke all on function public.claim_media_jobs(integer),public.media_job_objects(uuid),public.finish_media_job(uuid,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_media_jobs(integer),public.media_job_objects(uuid),public.finish_media_job(uuid,integer,boolean,text) to service_role;
commit;
