begin;

create table public.collections (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(btrim(title)) between 1 and 80),
 description text not null default '' check (char_length(description)<=500),
 is_default boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (not is_default or title='Saved')
);
create unique index collections_default_owner on public.collections(owner_id) where is_default;
create index collections_owner on public.collections(owner_id,created_at desc,id desc);
create table public.collection_items (
 collection_id uuid not null references public.collections(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 added_at timestamptz not null default now(),
 primary key(collection_id,project_id)
);
create index collection_items_newest on public.collection_items(collection_id,added_at desc,project_id desc);
create index collection_items_project on public.collection_items(project_id,collection_id);
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
create policy collections_public_read on public.collections for select to anon,authenticated
 using(private.is_active(owner_id) and exists(select 1 from public.profiles p where p.id=owner_id and p.username is not null));
create policy collection_items_public_read on public.collection_items for select to anon,authenticated
 using(private.project_visible(project_id) and exists(select 1 from public.collections c where c.id=collection_id));
revoke all on public.collections,public.collection_items from public,anon,authenticated;
grant select on public.collections,public.collection_items to anon,authenticated;

-- The account lock serializes quota checks and membership changes for a maker.
create function private.authorize_collection_write() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); used bigint; minute_start timestamptz:=date_trunc('minute',now());
begin
 if actor is null then raise exception 'not_authenticated' using errcode='42501';end if;
 perform 1 from private.account_controls where user_id=actor for update;
 if not private.is_active(actor) or not exists(select 1 from public.profiles where id=actor and username is not null) then raise exception 'forbidden' using errcode='42501';end if;
 insert into private.rate_limits(subject_key,action,window_start,count,expires_at) values(actor::text,'collection',minute_start,1,minute_start+interval '2 minutes')
 on conflict(subject_key,action,window_start) do update set count=private.rate_limits.count+1 returning count into used;
 if used>60 then raise exception 'rate_limited' using errcode='P0001';end if;
 return actor;
end;$$;
revoke all on function private.authorize_collection_write() from public,anon,authenticated;

create function public.create_collection(p_id uuid,p_title text,p_description text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.authorize_collection_write(); existing public.collections;
begin
 if p_id is null or p_title is null or char_length(btrim(p_title)) not between 1 and 80 or p_description is null or char_length(p_description)>500 then raise exception 'invalid_collection' using errcode='22023';end if;
 select * into existing from public.collections where id=p_id;
 if found then
  if existing.owner_id=actor and existing.title=btrim(p_title) and existing.description=btrim(p_description) and not existing.is_default then return existing.id;end if;
  raise exception 'collection_conflict' using errcode='22023';
 end if;
 -- Reserve a slot for the default Saved collection until the first save.
 if (select count(*) from public.collections where owner_id=actor and not is_default)>=29 then raise exception 'collection_limit' using errcode='54000';end if;
 insert into public.collections(id,owner_id,title,description) values(p_id,actor,btrim(p_title),btrim(p_description));
 return p_id;
end;$$;

create function public.update_collection(p_collection uuid,p_title text,p_description text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.authorize_collection_write();
begin
 if p_title is null or char_length(btrim(p_title)) not between 1 and 80 or p_description is null or char_length(p_description)>500 then raise exception 'invalid_collection' using errcode='22023';end if;
 update public.collections set title=btrim(p_title),description=btrim(p_description),updated_at=now() where id=p_collection and owner_id=actor and not is_default;
 if not found then raise exception 'collection_unavailable' using errcode='42501';end if;
end;$$;

create function public.delete_collection(p_collection uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.authorize_collection_write();
begin
 if exists(select 1 from public.collections where id=p_collection and (owner_id<>actor or is_default)) then raise exception 'forbidden' using errcode='42501';end if;
 delete from public.collections where id=p_collection and owner_id=actor and not is_default;
end;$$;

create function public.set_collection_item(p_project uuid,p_collection uuid,p_desired boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.authorize_collection_write(); target uuid:=p_collection;
begin
 if p_project is null or p_desired is null then raise exception 'invalid_membership' using errcode='22023';end if;
 if p_desired and not private.project_visible(p_project) then raise exception 'project_unavailable' using errcode='22023';end if;
 if target is null then
  select id into target from public.collections where owner_id=actor and is_default;
  if target is null and p_desired then
   insert into public.collections(owner_id,title,is_default) values(actor,'Saved',true) returning id into target;
  end if;
 elsif not exists(select 1 from public.collections where id=target and owner_id=actor) then raise exception 'forbidden' using errcode='42501';end if;
 if target is not null then
  if p_desired then insert into public.collection_items(collection_id,project_id) values(target,p_project) on conflict do nothing;
  else delete from public.collection_items where collection_id=target and project_id=p_project;end if;
 end if;
 return jsonb_build_object('collection_id',target,'saved',exists(select 1 from public.collection_items i join public.collections c on c.id=i.collection_id where c.owner_id=actor and i.project_id=p_project));
end;$$;

create function public.list_collections(p_owner uuid) returns table(id uuid,owner_id uuid,title text,description text,is_default boolean,project_count bigint,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select c.id,c.owner_id,c.title,c.description,c.is_default,(select count(*) from public.collection_items i where i.collection_id=c.id),c.created_at
 from public.collections c where c.owner_id=p_owner order by c.is_default desc,c.created_at desc,c.id desc limit 30;
$$;

create function public.get_public_collection(p_collection uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',c.id,'owner_id',c.owner_id,'title',c.title,'description',c.description,'is_default',c.is_default,'project_count',(select count(*) from public.collection_items i where i.collection_id=c.id),'maker_username',p.username,'maker_name',p.display_name)
 from public.collections c join public.profiles p on p.id=c.owner_id where c.id=p_collection;
$$;

create function public.get_my_collection_picker(p_project uuid) returns table(id uuid,title text,is_default boolean,contains_project boolean)
language sql stable security invoker set search_path='' as $$
 select c.id,c.title,c.is_default,exists(select 1 from public.collection_items i where i.collection_id=c.id and i.project_id=p_project)
 from public.collections c where c.owner_id=auth.uid() order by c.is_default desc,c.created_at desc,c.id desc limit 30;
$$;

create function public.get_my_saved_projects(p_projects uuid[]) returns table(project_id uuid)
language sql stable security invoker set search_path='' as $$
 select distinct i.project_id from public.collection_items i join public.collections c on c.id=i.collection_id where c.owner_id=auth.uid() and i.project_id=any(p_projects) and cardinality(p_projects)<=21;
$$;

create function public.list_collection_projects(p_collection uuid,p_after jsonb default null,p_limit integer default 21)
returns table(id uuid,name text,tagline text,description text,live_url text,github_url text,release_url text,published_at timestamptz,maker_id uuid,maker_username text,maker_name text,category text,category_slug text,stack text[],upvote_count bigint,added_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select p.*,i.added_at from public.collection_items i cross join lateral public.get_public_project(i.project_id) p
 where i.collection_id=p_collection and (p_after is null or (i.added_at,i.project_id)<((p_after->>'added')::timestamptz,(p_after->>'id')::uuid))
 order by i.added_at desc,i.project_id desc limit greatest(1,least(coalesce(p_limit,21),21));
$$;

revoke all on function public.create_collection(uuid,text,text),public.update_collection(uuid,text,text),public.delete_collection(uuid),public.set_collection_item(uuid,uuid,boolean),public.get_my_collection_picker(uuid),public.get_my_saved_projects(uuid[]) from public,anon;
grant execute on function public.create_collection(uuid,text,text),public.update_collection(uuid,text,text),public.delete_collection(uuid),public.set_collection_item(uuid,uuid,boolean),public.get_my_collection_picker(uuid),public.get_my_saved_projects(uuid[]) to authenticated;
revoke all on function public.list_collections(uuid),public.get_public_collection(uuid),public.list_collection_projects(uuid,jsonb,integer) from public;
grant execute on function public.list_collections(uuid),public.get_public_collection(uuid),public.list_collection_projects(uuid,jsonb,integer) to anon,authenticated;
commit;
