begin;

create function public.get_public_profile(p_username text)
returns table(id uuid,username text,display_name text,bio text,github_username text,github_connected_at timestamptz,created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id,p.username,p.display_name,p.bio,p.github_username,p.github_connected_at,p.created_at
  from public.profiles p where p.username=p_username and private.is_active(p.id);
$$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon,authenticated;

create function public.get_public_project(p_id uuid)
returns table(id uuid,name text,tagline text,description text,live_url text,github_url text,release_url text,
  published_at timestamptz,maker_id uuid,maker_username text,maker_name text,category text,category_slug text,stack text[],upvote_count bigint)
language sql stable security definer set search_path = '' as $$
  select p.id,p.name,p.tagline,p.description,p.live_url,p.github_url,p.release_url,p.published_at,
    p.maker_id,m.username,m.display_name,c.name,c.slug,
    array(select t.name from public.project_technologies pt join public.technologies t on t.id=pt.technology_id where pt.project_id=p.id order by t.name),
    (select count(*) from public.upvotes v where v.project_id=p.id and private.is_active(v.user_id))
  from public.projects p join public.profiles m on m.id=p.maker_id join public.categories c on c.id=p.category_id
  where p.id=p_id and p.status='published' and m.username is not null and private.is_active(m.id);
$$;
revoke all on function public.get_public_project(uuid) from public;
grant execute on function public.get_public_project(uuid) to anon,authenticated;

commit;
