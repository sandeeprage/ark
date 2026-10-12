begin;
create function private.require_notification_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();begin if actor is null or not private.is_active(actor) then raise exception 'forbidden' using errcode='42501';end if;return actor;end;$$;
revoke all on function private.require_notification_actor() from public,anon,authenticated;

create function public.get_my_notification_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_notification_actor();begin return jsonb_build_object('unread',(select count(*) from public.notifications where recipient_id=actor and withdrawn_at is null and read_at is null),'cutoff',now());end;$$;

create function public.list_my_notifications(p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 21)
returns table(id uuid,type text,created_at timestamptz,read_at timestamptz,actor_username text,actor_name text,project_id uuid,project_name text)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_notification_actor();
begin
 if (p_after_created_at is null)<>(p_after_id is null) then raise exception 'invalid_cursor' using errcode='22023';end if;
 return query select n.id,n.type,n.created_at,n.read_at,
 case when private.is_active(n.actor_id) then p.username end,
 case when private.is_active(n.actor_id) then p.display_name end,
 case when private.project_visible(n.project_id) then n.project_id end,
 case when private.project_visible(n.project_id) then j.name end
 from public.notifications n left join public.profiles p on p.id=n.actor_id left join public.projects j on j.id=n.project_id
 where n.recipient_id=actor and n.withdrawn_at is null
 and (p_after_id is null or (n.created_at,n.id)<(p_after_created_at,p_after_id))
 order by n.created_at desc,n.id desc limit greatest(1,least(coalesce(p_limit,21),21));
end;$$;

create function public.mark_my_notifications_read(p_ids uuid[] default null,p_cutoff timestamptz default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_notification_actor();
begin
 if (p_ids is null)=(p_cutoff is null) or coalesce(cardinality(p_ids),0)>100 or p_cutoff>now() then raise exception 'invalid_read_request' using errcode='22023';end if;
 update public.notifications set read_at=now() where recipient_id=actor and read_at is null and withdrawn_at is null
 and ((p_ids is not null and id=any(p_ids)) or (p_cutoff is not null and created_at<=p_cutoff));
end;$$;

create function public.get_my_notification_preferences() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_notification_actor();begin return (select jsonb_build_object('follows',notify_follows,'upvotes',notify_upvotes,'launches',notify_launches) from private.account_settings where user_id=actor);end;$$;

create function public.update_my_notification_preferences(p_follows boolean,p_upvotes boolean,p_launches boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_notification_actor();begin
 if p_follows is null or p_upvotes is null or p_launches is null then raise exception 'invalid_preferences' using errcode='22023';end if;
 update private.account_settings set notify_follows=p_follows,notify_upvotes=p_upvotes,notify_launches=p_launches where user_id=actor;
end;$$;

revoke all on function public.get_my_notification_status(),public.list_my_notifications(timestamptz,uuid,integer),public.mark_my_notifications_read(uuid[],timestamptz),public.get_my_notification_preferences(),public.update_my_notification_preferences(boolean,boolean,boolean) from public,anon;
grant execute on function public.get_my_notification_status(),public.list_my_notifications(timestamptz,uuid,integer),public.mark_my_notifications_read(uuid[],timestamptz),public.get_my_notification_preferences(),public.update_my_notification_preferences(boolean,boolean,boolean) to authenticated;
commit;
