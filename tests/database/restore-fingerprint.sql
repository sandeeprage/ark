-- Only the generated rehearsal databases; no production connection is accepted by the runner.
create function pg_temp.data_manifest() returns jsonb language plpgsql as $$
declare item record; result jsonb:='{}'; row_count bigint; digest text;
begin
 for item in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') and c.relkind='r' order by n.nspname,c.relname loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text collate "C"),''[]''::jsonb)::text) from %I.%I t',item.nspname,item.relname) into row_count,digest;
  result:=result||jsonb_build_object(item.nspname||'.'||item.relname,jsonb_build_object('rows',row_count,'digest',digest));
 end loop;
 return result;
end;$$;
select jsonb_build_object(
 'data',pg_temp.data_manifest(),
 'tables',(select jsonb_agg(to_jsonb(t) order by t.schema,t.name) from(select n.nspname as schema,c.relname as name,c.relrowsecurity,c.relforcerowsecurity,(select jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(a.grantor),'grantee',case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,'privilege',a.privilege_type,'grantable',a.is_grantable) order by a.grantor,a.grantee,a.privilege_type,a.is_grantable) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a) as acl,pg_get_userbyid(c.relowner) as owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth') and c.relkind='r') t),
 'schemas',(select jsonb_agg(to_jsonb(t) order by t.name) from(select nspname as name,nspacl::text as acl,pg_get_userbyid(nspowner) as owner from pg_namespace where nspname in ('public','private','auth'))t),
 'policies',(select jsonb_agg(to_jsonb(t) order by t.schemaname,t.tablename,t.policyname) from(select * from pg_policies where schemaname in ('public','private','auth'))t),
 'functions',(select jsonb_agg(to_jsonb(t) order by t.schema,t.name,t.args) from(select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as args,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl,pg_get_userbyid(p.proowner) as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth') and p.prokind='f') t),
 'columns',(select jsonb_agg(to_jsonb(t) order by t.table_schema,t.table_name,t.ordinal_position) from(select table_schema,table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default from information_schema.columns where table_schema in ('public','private','auth'))t),
 'column_privileges',(select jsonb_agg(to_jsonb(t) order by t.table_schema,t.table_name,t.column_name,t.grantor,t.grantee,t.privilege_type) from(select grantor,grantee,table_schema,table_name,column_name,privilege_type,is_grantable from information_schema.column_privileges where table_schema in ('public','private','auth'))t),
 'constraints',(select jsonb_agg(to_jsonb(t) order by t.schema,t.table_name,t.name) from(select n.nspname as schema,c.relname as table_name,con.conname as name,pg_get_constraintdef(con.oid) as definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','auth')) t),
 'indexes',(select jsonb_agg(to_jsonb(t) order by t.schemaname,t.tablename,t.indexname) from(select * from pg_indexes where schemaname in ('public','private','auth')) t),
 'triggers',(select jsonb_agg(to_jsonb(t) order by t.schema,t.table_name,t.name) from(select n.nspname as schema,c.relname as table_name,tr.tgname as name,tr.tgenabled,pg_get_triggerdef(tr.oid) as definition from pg_trigger tr join pg_class c on c.oid=tr.tgrelid join pg_namespace n on n.oid=c.relnamespace where not tr.tgisinternal and n.nspname in ('public','private','auth')) t)
);
