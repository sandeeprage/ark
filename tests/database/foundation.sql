-- Run against an isolated database with the foundation migration applied.
-- All fixtures are rolled back. NEVER run the auth stub in Supabase.
begin;
create function pg_temp.assert_true(condition boolean,label text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end;
$$;
create function pg_temp.expect_error(statement text,code text,label text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute statement; exception when others then
    if sqlstate <> code then raise exception 'FAIL: %; expected %, got %',label,code,sqlstate; end if;
    failed := true;
  end;
  if not failed then raise exception 'FAIL: %; unexpectedly succeeded',label; end if;
  raise notice 'PASS: %',label;
end;
$$;

insert into auth.users(id,raw_user_meta_data,email_confirmed_at) values
('00000000-0000-4000-a000-000000000001','{"name":"Alice","user_name":"spoof","provider_id":"999"}',now()),
('00000000-0000-4000-a000-000000000002','{"name":"Bob"}',now()),
('00000000-0000-4000-a000-000000000003','{"name":"Suspended"}',now());
insert into auth.identities(user_id,provider,provider_id,identity_data) values
('00000000-0000-4000-a000-000000000001','github','12345','{"user_name":"alice-real"}');
update public.profiles set username=case id when '00000000-0000-4000-a000-000000000001' then 'alice' when '00000000-0000-4000-a000-000000000002' then 'bob' else 'suspended' end;
update private.account_controls set status='suspended' where user_id='00000000-0000-4000-a000-000000000003';

insert into public.projects(id,maker_id,name,tagline,description,release_url,category_id,status,published_at,publish_request_key) values
('10000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001','Literal 100% toolkit','A shipped toolkit for developers',repeat('A useful project. ',10),'https://example.test/toolkit',(select id from public.categories where slug='developer-tools'),'published','2026-10-10T00:00:00Z','test-1'),
('10000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000002','Newest toolkit','Another shipped developer toolkit',repeat('Another useful project. ',10),'https://example.test/new',(select id from public.categories where slug='libraries'),'published','2026-10-11T00:00:00Z','test-2'),
('10000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000003','Suspended toolkit','Must not be publicly available',repeat('Hidden from public. ',10),'https://example.test/blocked',(select id from public.categories where slug='libraries'),'published','2026-10-12T00:00:00Z','test-3'),
('10000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000001','Hidden toolkit','Must not be publicly available',repeat('Hidden from public. ',10),'https://example.test/hidden',(select id from public.categories where slug='libraries'),'hidden','2026-10-12T00:00:00Z','test-4');
insert into public.upvotes(user_id,project_id) values
('00000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000001'),
('00000000-0000-4000-a000-000000000003','10000000-0000-4000-a000-000000000002');
insert into public.project_technologies(project_id,technology_id) values
('10000000-0000-4000-a000-000000000001',(select id from public.technologies where slug='react')),
('10000000-0000-4000-a000-000000000002',(select id from public.technologies where slug='python'));

set local role anon;
select pg_temp.assert_true((select count(*)=2 from public.profiles),'anonymous sees active onboarded profiles only');
select pg_temp.assert_true((select count(*)=2 from public.projects),'anonymous sees active published projects only');
select pg_temp.expect_error('select * from private.account_settings','42501','private settings cannot be read anonymously');
select pg_temp.expect_error('select * from private.user_roles','42501','roles cannot be read anonymously');
select pg_temp.expect_error('select * from public.upvotes','42501','voter identities are not public');
select pg_temp.expect_error('select * from public.project_media','42501','media object paths are not public');
select pg_temp.assert_true((select name='Literal 100% toolkit' from public.list_projects() limit 1),'popular sorts by valid total upvotes');
select pg_temp.assert_true((select name='Newest toolkit' from public.list_projects(p_feed=>'latest') limit 1),'latest sorts by original publication time');
select pg_temp.assert_true((select upvote_count=0 from public.list_projects() where name='Newest toolkit'),'suspended votes are excluded');
select pg_temp.assert_true((select count(*)=1 from public.list_projects(p_query=>'100%')),'search treats percent as a literal');
select pg_temp.assert_true((select count(*)=2 from public.list_projects(p_stack=>array['react','python'])),'stack filtering uses OR');
select pg_temp.assert_true((select count(*)=0 from public.list_projects(p_category=>'libraries',p_stack=>array['react'])),'category and stack filtering use AND');
select pg_temp.assert_true((select count(*)=0 from public.search_makers('suspended')),'search cannot expose suspended makers');
select pg_temp.assert_true((select count(*)=0 from public.get_public_profile('suspended')),'direct profile read hides suspended makers');
select pg_temp.assert_true((select count(*)=0 from public.get_public_project('10000000-0000-4000-a000-000000000004')),'direct project read hides moderated projects');
select pg_temp.assert_true((select count(*)=0 from public.get_public_project('10000000-0000-4000-a000-000000000003')),'direct project read hides suspended makers');
select pg_temp.assert_true((select upvote_count=1 from public.get_public_project('10000000-0000-4000-a000-000000000001')),'direct project read derives valid counts');
select pg_temp.expect_error('select public.update_my_profile(''hacker'',''Hacker'','''')','42501','anonymous cannot edit a profile');
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
set local role authenticated;
select pg_temp.assert_true(public.my_account_status()='active','status is scoped to authenticated actor');
select public.update_my_profile('alice_dev','Alice updated','My bio');
select pg_temp.assert_true((select display_name='Alice updated' from public.profiles where username='alice_dev'),'owner can update safe profile fields');
select pg_temp.assert_true((select display_name='Bob' from public.profiles where username='bob'),'profile function never changes another maker');
select pg_temp.expect_error('update public.profiles set github_user_id=999','42501','direct connected identity spoofing is denied');
select pg_temp.expect_error('insert into private.user_roles(user_id,role) values(auth.uid(),''admin'')','42501','user cannot elevate their role');
select pg_temp.expect_error('select public.update_my_profile(''bob'',''Alice'','''')','23505','duplicate usernames are rejected');
select pg_temp.expect_error('select public.update_my_profile(''admin'',''Alice'','''')','23514','reserved usernames are rejected in the database');
select public.sync_my_github_identity();
select pg_temp.assert_true((select github_user_id=12345 and github_username='alice-real' from public.profiles where id=auth.uid()),'GitHub identity comes from trusted provider data');
select pg_temp.expect_error('insert into public.upvotes(user_id,project_id) values(auth.uid(),''10000000-0000-4000-a000-000000000002'')','42501','unchecked social writes remain denied');
reset role;

update private.account_controls set status='suspended' where user_id='00000000-0000-4000-a000-000000000001';
set local role authenticated;
select pg_temp.assert_true(public.my_account_status()='suspended','existing session observes authoritative suspension');
select pg_temp.expect_error('select public.update_my_profile(''alice_dev'',''Changed'','''')','42501','suspended session cannot mutate');
select pg_temp.expect_error('select public.sync_my_github_identity()','42501','suspended session cannot alter connection metadata');
select pg_temp.assert_true((select count(*)=1 from public.list_projects()),'suspension removes projects from discovery immediately');
select pg_temp.assert_true((select count(*)=0 from public.get_public_profile('alice_dev')),'public profile stays unavailable even to its suspended owner');
reset role;
rollback;
