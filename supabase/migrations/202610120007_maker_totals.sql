begin;
create function public.get_public_maker_totals(p_maker uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'projects',(select count(*) from public.projects p where p.maker_id=p_maker and private.project_visible(p.id)),
    'upvotes',(select count(*) from public.upvotes v join public.projects p on p.id=v.project_id where p.maker_id=p_maker and private.project_visible(p.id) and private.is_active(v.user_id))
  ) where exists(select 1 from public.profiles where id=p_maker and username is not null and private.is_active(id));
$$;
revoke all on function public.get_public_maker_totals(uuid) from public;
grant execute on function public.get_public_maker_totals(uuid) to anon,authenticated;
commit;
