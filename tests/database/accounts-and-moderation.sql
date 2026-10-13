-- ISOLATED TEST DATABASE ONLY. Fixture rows and decisions are rolled back.
begin;
create function pg_temp.assert_true(condition boolean,label text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end;$$;
create function pg_temp.expect_error(statement text,code text,label text) returns void language plpgsql as $$
declare failed boolean:=false;begin begin execute statement;exception when others then if sqlstate<>code then raise exception 'FAIL: % expected %, got %',label,code,sqlstate;end if;failed:=true;end;if not failed then raise exception 'FAIL: % unexpectedly succeeded',label;end if;raise notice 'PASS: %',label;end;$$;

insert into auth.users(id,raw_user_meta_data,email_confirmed_at,last_sign_in_at) values
('00000000-0000-4000-a000-000000000001','{"name":"Alice"}',now(),now()),
('00000000-0000-4000-a000-000000000002','{"name":"Bob"}',now(),now()),
('00000000-0000-4000-a000-000000000003','{"name":"Admin"}',now(),now());
update public.profiles set username=case id when '00000000-0000-4000-a000-000000000001' then 'alice' when '00000000-0000-4000-a000-000000000002' then 'bob' else 'audit_admin' end;
insert into private.user_roles(user_id,role) values('00000000-0000-4000-a000-000000000003','admin');
insert into public.projects(id,maker_id,name,tagline,description,release_url,category_id,status,published_at,publish_request_key)
values('10000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001','Audit project','A completed audit testing project',repeat('Useful software. ',12),'https://example.test/audit',(select id from public.categories limit 1),'published',now(),'audit-project');
insert into public.project_media(id,project_id,object_key,mime_type,size_bytes,width,height,alt_text,position,state) values('30000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001/10000000-0000-4000-a000-000000000001/30000000-0000-4000-a000-000000000001.webp','image/webp',100,40,40,'An isolated screenshot',0,'ready');
update public.projects set cover_media_id='30000000-0000-4000-a000-000000000001' where id='10000000-0000-4000-a000-000000000001';

set local role anon;
select pg_temp.expect_error('select * from private.content_reports','42501','anonymous cannot read report details');
select pg_temp.expect_error('select * from private.moderation_audit','42501','anonymous cannot read decisions');
select pg_temp.expect_error('select public.list_content_reports()','42501','anonymous cannot use admin reader');
select pg_temp.expect_error('select public.request_my_account_erasure(''alice'')','42501','anonymous cannot request account erasure');
select pg_temp.assert_true((select has_avatar=false from public.get_public_profile_details('alice')),'public profile exposes only avatar presence');
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',true);
set local role authenticated;
select pg_temp.assert_true(public.my_admin_access()=false,'ordinary user has no admin access');
select pg_temp.expect_error('select public.list_content_reports()','42501','ordinary user cannot read reports');
select pg_temp.expect_error('select public.list_moderation_audit()','42501','ordinary user cannot read audit');
select pg_temp.expect_error('select public.set_profile_avatar(auth.uid(),null)','42501','browser cannot write arbitrary avatar references');
select pg_temp.expect_error('select public.claim_account_erasure_jobs()','42501','browser cannot claim erasure jobs');
select pg_temp.expect_error('select public.request_my_account_erasure(''alice'')','22023','confirmation cannot erase another account');
select public.report_content('project','10000000-0000-4000-a000-000000000001','unsafe','A specific concern for the isolated test.');
select pg_temp.expect_error('select public.report_content(''project'',''10000000-0000-4000-a000-000000000001'',''spam'',''A repeated report for the same content.'')','23505','only one open report per reporter/target');
select pg_temp.assert_true(jsonb_array_length(public.get_my_report_statuses())=1,'reporter can see their own sanitized status');
select pg_temp.assert_true(not(public.get_my_report_statuses()->0 ? 'details'),'sanitized report status omits free text');
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
set local role authenticated;
select pg_temp.expect_error('select public.report_content(''project'',''10000000-0000-4000-a000-000000000001'',''other'',''A report about my own project.'')','42501','maker cannot report own content');
select pg_temp.assert_true(jsonb_array_length(public.get_my_report_statuses())=0,'reporter statuses are isolated by actor');
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
set local role authenticated;
select pg_temp.assert_true(public.my_admin_access()=true,'explicitly assigned active admin is recognized');
select pg_temp.assert_true(jsonb_array_length(public.list_content_reports())=1,'admin can review reports');
select public.moderate_report((public.list_content_reports()->0->>'id')::uuid,'hide','Unsafe destination confirmed in isolated test.');
select pg_temp.assert_true(jsonb_array_length(public.list_moderation_audit())=1,'decision is recorded');
select pg_temp.assert_true(public.list_moderation_audit()->0->'before_state'->>'status'='published','audit captures structured prior state');
select pg_temp.assert_true(public.list_moderation_audit()->0->'after_state'->>'status'='hidden','audit captures structured new state');
select pg_temp.expect_error('delete from private.moderation_audit','42501','admin cannot directly rewrite audit history');
reset role;
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.get_public_project('10000000-0000-4000-a000-000000000001')),'hidden project stops public reads');
reset role;
set local role authenticated;
select public.moderate_report((public.list_content_reports()->0->>'id')::uuid,'restore','The unsafe destination was resolved in test.');
reset role;
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.get_public_project('10000000-0000-4000-a000-000000000001')),'restored project is visible again');
reset role;

set local role service_role;
select public.reserve_profile_avatar('00000000-0000-4000-a000-000000000001','avatars/00000000-0000-4000-a000-000000000001/20000000-0000-4000-a000-000000000001.webp');
select public.set_profile_avatar('00000000-0000-4000-a000-000000000001','avatars/00000000-0000-4000-a000-000000000001/20000000-0000-4000-a000-000000000001.webp');
select pg_temp.expect_error('select public.set_profile_avatar(''00000000-0000-4000-a000-000000000001'',''avatars/00000000-0000-4000-a000-000000000002/20000000-0000-4000-a000-000000000001.webp'')','22023','avatar references cannot cross owner prefixes');
reset role;
set local role anon;
select pg_temp.assert_true((select has_avatar from public.get_public_profile_details('alice')),'new avatar presence is public without private storage key');
reset role;

update auth.users set last_sign_in_at=now()-interval '1 day' where id='00000000-0000-4000-a000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
set local role authenticated;
select pg_temp.expect_error('select public.request_my_account_erasure(''alice'')','42501','database independently requires recent authentication');
reset role;
update auth.users set last_sign_in_at=now() where id='00000000-0000-4000-a000-000000000001';
set local role authenticated;
select public.request_my_account_erasure('alice');
select public.request_my_account_erasure('alice');
select pg_temp.assert_true(public.my_account_status()='deleting','erasure makes account immediately ineligible');
select pg_temp.expect_error('select public.update_my_profile(''alice'',''Alice'','''')','42501','deleting account cannot mutate product data');
reset role;
select pg_temp.assert_true((select count(*)=1 from private.maintenance_jobs where type='account_erasure'),'erasure requests are idempotent');
select pg_temp.assert_true((select payload->'objects' @> '[{"bucket":"ark-avatars","key":"avatars/00000000-0000-4000-a000-000000000001/20000000-0000-4000-a000-000000000001.webp"}]'::jsonb from private.maintenance_jobs where type='account_erasure'),'cleanup references survive outside cascading product rows');
select pg_temp.assert_true((select details='[Removed following account deletion]' from private.content_reports limit 1),'deletion redacts retained report text');
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.get_public_profile_details('alice')),'deleting portfolio disappears immediately');
reset role;

create temporary table claimed as select public.claim_account_erasure_jobs(1) as job;
grant select on claimed to service_role;
set local role service_role;
select pg_temp.expect_error(format('select public.finish_account_erasure(%L,1,true)',(select job->>'id' from claimed)),'40001','job cannot complete before Auth deletion');
reset role;
delete from auth.users where id='00000000-0000-4000-a000-000000000001';
set constraints all immediate;
select public.finish_account_erasure((select job->>'id' from claimed)::uuid,1,true);
select pg_temp.assert_true((select payload='{}'::jsonb and status='completed' from private.maintenance_jobs where type='account_erasure'),'completed job drops private cleanup payload');
select pg_temp.assert_true((select count(*)=0 from public.projects where maker_id='00000000-0000-4000-a000-000000000001'),'Auth deletion cascades ordinary portfolio records');
select pg_temp.assert_true((select count(*)=2 from private.moderation_audit),'erasure preserves minimal moderation audit');
rollback;
