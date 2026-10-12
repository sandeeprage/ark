begin;
create function public.get_pinned_projects(p_maker uuid)
returns table(id uuid,name text,tagline text,description text,live_url text,github_url text,release_url text,published_at timestamptz,maker_id uuid,maker_username text,maker_name text,category text,category_slug text,stack text[],upvote_count bigint)
language sql stable security invoker set search_path='' as $$
  select project.* from public.profile_pins pin cross join lateral public.get_public_project(pin.project_id) project where pin.profile_id=p_maker order by pin.position;
$$;
revoke all on function public.get_pinned_projects(uuid) from public;
grant execute on function public.get_pinned_projects(uuid) to anon,authenticated;
commit;
