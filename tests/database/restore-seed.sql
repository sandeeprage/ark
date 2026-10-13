-- Synthetic data for a guarded, disposable restore rehearsal only.
begin;
insert into auth.users(id,raw_user_meta_data,email_confirmed_at,last_sign_in_at) values
('11111111-1111-4111-a111-111111111111','{"name":"Restore Alice"}',now(),now()),
('22222222-2222-4222-a222-222222222222','{"name":"Restore Bob"}',now(),now()),
('33333333-3333-4333-a333-333333333333','{"name":"Restore Admin"}',now(),now());
update public.profiles set username=case id
 when '11111111-1111-4111-a111-111111111111' then 'restore_alice'
 when '22222222-2222-4222-a222-222222222222' then 'restore_bob'
 else 'restore_admin' end;
insert into auth.identities(user_id,provider,provider_id,identity_data) values
('11111111-1111-4111-a111-111111111111','github','700001','{"user_name":"restore_alice_gh"}'),
('33333333-3333-4333-a333-333333333333','google','restore-google-admin','{"email_verified":true}');
insert into private.user_roles(user_id,role,granted_by) values
('33333333-3333-4333-a333-333333333333','admin','33333333-3333-4333-a333-333333333333');
insert into public.projects(id,maker_id,name,tagline,description,release_url,category_id,status,published_at,publish_request_key) values
('44444444-4444-4444-a444-444444444444','11111111-1111-4111-a111-111111111111','Restore portfolio','Synthetic completed project for restore testing',repeat('Synthetic restore fixture. ',8),'https://restore-fixture.invalid/release',(select id from public.categories where slug='developer-tools'),'published',now(),'restore-public'),
('55555555-5555-4555-a555-555555555555','22222222-2222-4222-a222-222222222222','Hidden restore portfolio','Synthetic hidden project for restore testing',repeat('Synthetic restore fixture. ',8),'https://restore-fixture.invalid/hidden',(select id from public.categories where slug='developer-tools'),'hidden',now(),'restore-hidden');
insert into public.project_media(id,project_id,object_key,mime_type,size_bytes,width,height,alt_text,position,state) values
('66666666-6666-4666-a666-666666666666','44444444-4444-4444-a444-444444444444','11111111-1111-4111-a111-111111111111/44444444-4444-4444-a444-444444444444/66666666-6666-4666-a666-666666666666.webp','image/webp',__COVER_BYTES__,160,80,'Synthetic restored cover',0,'ready'),
('77777777-7777-4777-a777-777777777777','55555555-5555-4555-a555-555555555555','22222222-2222-4222-a222-222222222222/55555555-5555-4555-a555-555555555555/77777777-7777-4777-a777-777777777777.webp','image/webp',__COVER_BYTES__,160,80,'Synthetic hidden cover',0,'ready');
update public.projects set cover_media_id=case id
 when '44444444-4444-4444-a444-444444444444' then '66666666-6666-4666-a666-666666666666'::uuid
 else '77777777-7777-4777-a777-777777777777'::uuid end;
update public.profiles set avatar_object_key='avatars/11111111-1111-4111-a111-111111111111/88888888-8888-4888-a888-888888888888.webp',avatar_updated_at=now() where username='restore_alice';
insert into public.project_technologies(project_id,technology_id) values
('44444444-4444-4444-a444-444444444444',(select id from public.technologies where slug='typescript'));
insert into public.profile_pins(profile_id,project_id,position) values
('11111111-1111-4111-a111-111111111111','44444444-4444-4444-a444-444444444444',0);
insert into public.upvotes(user_id,project_id) values
('33333333-3333-4333-a333-333333333333','44444444-4444-4444-a444-444444444444');
insert into public.follows(follower_id,following_id) values
('33333333-3333-4333-a333-333333333333','11111111-1111-4111-a111-111111111111');
insert into public.notifications(id,recipient_id,actor_id,type,project_id,dedupe_key) values
('dddddddd-dddd-4ddd-addd-dddddddddddd','11111111-1111-4111-a111-111111111111','33333333-3333-4333-a333-333333333333','follow',null,'restore-rehearsal-follow'),
('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee','33333333-3333-4333-a333-333333333333','11111111-1111-4111-a111-111111111111','launch','44444444-4444-4444-a444-444444444444','restore-rehearsal-launch');
insert into public.collections(id,owner_id,title,description) values
('99999999-9999-4999-a999-999999999999','33333333-3333-4333-a333-333333333333','Restore collection','Synthetic public collection');
insert into public.collection_items(collection_id,project_id) values
('99999999-9999-4999-a999-999999999999','44444444-4444-4444-a444-444444444444');
insert into private.content_reports(id,reporter_id,target_kind,target_id,reason,details,status,resolved_at) values
('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','33333333-3333-4333-a333-333333333333','project','44444444-4444-4444-a444-444444444444','other','Synthetic concern for restore testing.','dismissed',now());
insert into private.moderation_audit(id,actor_id,target_kind,target_id,action,reason,report_id,before_state,after_state) values
('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','33333333-3333-4333-a333-333333333333','project','44444444-4444-4444-a444-444444444444','dismiss','Synthetic restore decision.','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','{"status":"published"}','{"status":"published"}');
update private.account_settings set notify_upvotes=false where user_id='11111111-1111-4111-a111-111111111111';
update private.account_controls set status='deleting' where user_id='22222222-2222-4222-a222-222222222222';
insert into private.maintenance_jobs(id,dedupe_key,type,payload) values
('cccccccc-cccc-4ccc-accc-cccccccccccc','restore-rehearsal-account','account_erasure','{"user_id":"22222222-2222-4222-a222-222222222222","objects":[{"bucket":"ark-media","key":"22222222-2222-4222-a222-222222222222/55555555-5555-4555-a555-555555555555/77777777-7777-4777-a777-777777777777.webp"}]}');
commit;
