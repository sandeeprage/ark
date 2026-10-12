begin;

create function public.get_maker_follow_state(p_maker uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'followers',(select count(*) from public.follows f where f.following_id=p_maker and private.is_active(f.follower_id)),
 'following',(select count(*) from public.follows f where f.follower_id=p_maker and private.is_active(f.following_id)),
 'followed',exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p_maker and private.is_active(auth.uid())))
 where private.is_active(p_maker) and exists(select 1 from public.profiles where id=p_maker and username is not null);
$$;
revoke all on function public.get_maker_follow_state(uuid) from public;
grant execute on function public.get_maker_follow_state(uuid) to anon,authenticated;

create function public.set_maker_follow(p_maker uuid,p_desired boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_follow boolean; used bigint; follow_window timestamptz:=date_trunc('minute',now());
begin
 if actor is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if p_desired is null or p_maker is null or p_maker=actor then raise exception 'invalid_target' using errcode='22023';end if;
 -- Lock both account states in a stable order; concurrent reciprocal follows cannot deadlock.
 perform user_id from private.account_controls where user_id in (actor,p_maker) order by user_id for update;
 if not private.is_active(actor) or not exists(select 1 from public.profiles where id=actor and username is not null) then raise exception 'forbidden' using errcode='42501';end if;
 if p_desired and (not private.is_active(p_maker) or not exists(select 1 from public.profiles where id=p_maker and username is not null)) then raise exception 'maker_unavailable' using errcode='22023';end if;
 select exists(select 1 from public.follows where follower_id=actor and following_id=p_maker) into current_follow;
 if current_follow is distinct from p_desired then
  insert into private.rate_limits(subject_key,action,window_start,count,expires_at)
   values(actor::text,'follow',follow_window,1,follow_window+interval '2 minutes')
   on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+1 returning count into used;
  if used>30 then raise exception 'rate_limited' using errcode='P0001';end if;
  if p_desired then
   insert into public.follows(follower_id,following_id) values(actor,p_maker) on conflict do nothing;
   update public.notifications set withdrawn_at=null where recipient_id=p_maker and dedupe_key='follow:'||actor::text;
   if not found and exists(select 1 from private.account_settings where user_id=p_maker and notify_follows) then
    insert into public.notifications(recipient_id,actor_id,type,dedupe_key) values(p_maker,actor,'follow','follow:'||actor::text) on conflict do nothing;
   end if;
  else
   delete from public.follows where follower_id=actor and following_id=p_maker;
   update public.notifications set withdrawn_at=now(),read_at=coalesce(read_at,now()) where recipient_id=p_maker and dedupe_key='follow:'||actor::text;
  end if;
 end if;
 return coalesce(public.get_maker_follow_state(p_maker),jsonb_build_object('followers',0,'following',0,'followed',false));
end;$$;
revoke all on function public.set_maker_follow(uuid,boolean) from public,anon;
grant execute on function public.set_maker_follow(uuid,boolean) to authenticated;

create function public.list_maker_connections(p_maker uuid,p_direction text,p_after uuid default null,p_limit integer default 21)
returns table(id uuid,username text,display_name text,bio text)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_direction is null or p_direction not in ('followers','following') then raise exception 'invalid_direction' using errcode='22023';end if;
 return query select p.id,p.username,p.display_name,p.bio from public.follows f join public.profiles p
 on p.id=case when p_direction='followers' then f.follower_id else f.following_id end
 where (case when p_direction='followers' then f.following_id else f.follower_id end)=p_maker
 and private.is_active(p_maker) and private.is_active(p.id) and p.username is not null
 and (p_after is null or p.id>p_after) order by p.id limit greatest(1,least(coalesce(p_limit,21),21));
end;$$;
revoke all on function public.list_maker_connections(uuid,text,uuid,integer) from public;
grant execute on function public.list_maker_connections(uuid,text,uuid,integer) to anon,authenticated;

-- The existing project reader is extended below with authenticated Following membership.
create or replace function public.list_projects(
  p_feed text default 'popular', p_category text default null, p_stack text[] default '{}',
  p_query text default '', p_cursor jsonb default null, p_limit integer default 20, p_maker uuid default null
) returns table(id uuid,name text,tagline text,description text,live_url text,github_url text,release_url text,
  published_at timestamptz,maker_id uuid,maker_username text,maker_name text,category text,category_slug text,stack text[],upvote_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_feed not in ('popular','latest','following') or char_length(p_query) > 100 or cardinality(p_stack) > 10 then raise exception 'validation_failed' using errcode = '22023'; end if;
  if p_feed='following' and (auth.uid() is null or not private.is_active(auth.uid())) then raise exception 'forbidden' using errcode='42501';end if;
  return query
  with summaries as (
    select p.id,p.name,p.tagline,p.description,p.live_url,p.github_url,p.release_url,p.published_at,
      p.maker_id,m.username as maker_username,m.display_name as maker_name,c.name as category,c.slug as category_slug,
      array(select t.name from public.project_technologies pt join public.technologies t on t.id=pt.technology_id where pt.project_id=p.id order by t.name) as stack,
      (select count(*) from public.upvotes v where v.project_id=p.id and private.is_active(v.user_id)) as upvote_count
    from public.projects p join public.profiles m on m.id=p.maker_id join public.categories c on c.id=p.category_id
    where p.status='published' and m.username is not null and private.is_active(m.id)
      and (p_feed<>'following' or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.maker_id))
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


commit;
