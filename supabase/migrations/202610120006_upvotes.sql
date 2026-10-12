begin;

-- Caller-selected actor IDs and direct vote/notification writes stay forbidden.
create function public.get_my_project_votes(p_projects uuid[])
returns table(project_id uuid) language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_active(auth.uid()) then raise exception 'forbidden' using errcode='42501';end if;
  if coalesce(cardinality(p_projects),0)>20 then raise exception 'invalid_batch' using errcode='22023';end if;
  return query select v.project_id from public.upvotes v where v.user_id=auth.uid() and v.project_id=any(p_projects) and private.project_visible(v.project_id);
end;$$;
revoke all on function public.get_my_project_votes(uuid[]) from public,anon;
grant execute on function public.get_my_project_votes(uuid[]) to authenticated;

create function public.set_project_upvote(p_project uuid,p_desired boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_maker(); target public.projects; current_vote boolean; total bigint; used bigint; vote_window timestamptz:=date_trunc('minute',now());
begin
  if p_desired is null then raise exception 'invalid_state' using errcode='22023';end if;
  -- Serialize every vote mutation on this project, including retries from other tabs.
  select * into target from public.projects where id=p_project for update;
  if not found or not private.project_visible(p_project) then raise exception 'project_unavailable' using errcode='22023';end if;
  if target.maker_id=actor then raise exception 'self_upvote' using errcode='22023';end if;
  select exists(select 1 from public.upvotes where user_id=actor and project_id=p_project) into current_vote;
  if current_vote is distinct from p_desired then
    insert into private.rate_limits(subject_key,action,window_start,count,expires_at)
      values(actor::text,'upvote',vote_window,1,vote_window+interval '2 minutes')
      on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+1 returning count into used;
    if used>120 then raise exception 'rate_limited' using errcode='P0001';end if;
    if p_desired then
      insert into public.upvotes(user_id,project_id) values(actor,p_project) on conflict do nothing;
      -- Existing events retain their original read state. Preferences govern new events.
      update public.notifications set withdrawn_at=null
        where recipient_id=target.maker_id and dedupe_key='upvote:'||actor::text||':'||p_project::text;
      if not found and exists(select 1 from private.account_settings where user_id=target.maker_id and notify_upvotes) then
        insert into public.notifications(recipient_id,actor_id,type,project_id,dedupe_key)
          values(target.maker_id,actor,'upvote',p_project,'upvote:'||actor::text||':'||p_project::text) on conflict do nothing;
      end if;
    else
      delete from public.upvotes where user_id=actor and project_id=p_project;
      update public.notifications set withdrawn_at=now(),read_at=coalesce(read_at,now())
        where recipient_id=target.maker_id and dedupe_key='upvote:'||actor::text||':'||p_project::text;
    end if;
  end if;
  select count(*) into total from public.upvotes where project_id=p_project and private.is_active(user_id);
  return jsonb_build_object('count',total,'upvoted',p_desired);
end;$$;
revoke all on function public.set_project_upvote(uuid,boolean) from public,anon;
grant execute on function public.set_project_upvote(uuid,boolean) to authenticated;
commit;
