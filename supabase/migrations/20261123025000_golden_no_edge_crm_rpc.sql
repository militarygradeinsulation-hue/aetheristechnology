-- Authenticated PostgREST fallback: no Edge Function runtime or runner required.
-- Keep CRM tables inaccessible to browser roles; expose only narrowly scoped RPCs.
create schema if not exists golden_private;
revoke all on schema golden_private from public, anon, authenticated;
grant usage on schema golden_private to authenticated;

create or replace function golden_private.crm_company_context(p_scan_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_url text; v_creator uuid; v_host text; v_accounts integer;
 v_count integer := 0; v_company public.mirror_companies%rowtype; v_preview jsonb;
begin
 if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
   return pg_catalog.jsonb_build_object('ok',false,'error','Signed-in CRM owner required');
 end if;
 select s.target_url,s.creator_user_id into v_url,v_creator from public.forensic_scans s where s.id=p_scan_id;
 if not found or (v_creator is not null and v_creator<>v_user) then
   return pg_catalog.jsonb_build_object('ok',true,'status','no_exact_match');
 end if;
 v_host:=pg_catalog.lower(pg_catalog.split_part(pg_catalog.split_part(pg_catalog.split_part(
     pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(v_url,'')),'^https?://','','i'),
     '/',1),'?',1),'#',1));
 v_host:=pg_catalog.regexp_replace(v_host,'^www[.]','','i');
 if v_host !~ '^[a-z0-9-]+([.][a-z0-9-]+)+$' or pg_catalog.length(v_host)>253
    or v_host ~ '(^localhost[.]|[.]localhost$|[.]local$)' then
   return pg_catalog.jsonb_build_object('ok',true,'status','invalid_report_domain');
 end if;
 select count(*) into v_accounts from public.accounts a
  where a.user_id=v_user and a.hubspot_connected_at is not null and a.hubspot_refresh_token_encrypted is not null;
 if v_accounts=0 then return pg_catalog.jsonb_build_object('ok',true,'status','no_owned_connected_account'); end if;
 if v_accounts>25 then return pg_catalog.jsonb_build_object('ok',true,'status','too_many_accounts'); end if;
 for v_company in
  select c.* from public.accounts a join public.mirror_companies c on c.account_id=a.id
  where a.user_id=v_user and a.hubspot_connected_at is not null
    and a.hubspot_refresh_token_encrypted is not null
    and pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(c.domain,'')),'^www[.]','','i'))=v_host
  order by c.id limit 2
 loop
  v_count:=v_count+1;
  if v_count>1 then return pg_catalog.jsonb_build_object('ok',true,'status','ambiguous'); end if;
  v_preview:=pg_catalog.jsonb_build_object(
    'report_domain',v_host,'company_record_id',v_company.id,
    'company_name',pg_catalog.left(coalesce(v_company.name,''),100),
    'industry_recorded',nullif(pg_catalog.btrim(coalesce(v_company.industry,'')),'') is not null,
    'company_owner_recorded',nullif(pg_catalog.btrim(coalesce(v_company.owner_id,'')),'') is not null,
    'company_activity_recorded',v_company.last_activity_date is not null,
    'last_company_activity',case when v_company.last_activity_date is null then null else pg_catalog.to_char(v_company.last_activity_date,'YYYY-MM-DD') end,
    'last_company_sync',case when v_company.synced_at is null then null else pg_catalog.to_char(v_company.synced_at,'YYYY-MM-DD') end,
    'statement','The signed-in CRM owner has a company record matching '||v_host||
      '. The company-level owner field is '||case when nullif(pg_catalog.btrim(coalesce(v_company.owner_id,'')),'') is null then 'blank' else 'populated' end||
      '. The last company activity field is '||case when v_company.last_activity_date is null then 'unknown' else 'dated '||pg_catalog.to_char(v_company.last_activity_date,'YYYY-MM-DD') end||
      '. This cannot establish quote follow-up, lead response time, buyer motives or financial loss.',
    'limitations',pg_catalog.jsonb_build_array(
      'The company record comes only from the signed-in user''s connected CRM.',
      'No contacts, deals, calls, payments, or engagements were accessed.',
      'A company owner field is not evidence of specific lead ownership.',
      'This is context for human review, not a verified business finding.'));
 end loop;
 if v_count=0 then return pg_catalog.jsonb_build_object('ok',true,'status','no_exact_match'); end if;
 return pg_catalog.jsonb_build_object('ok',true,'status','matched','preview',v_preview);
end;
$$;

create or replace function golden_private.crm_review_action(p_scan_id uuid,p_action text,p_record jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
 v_owner text := 'crm_owner:'||auth.uid()::text; v_access jsonb; v_records jsonb;
 v_hypothesis text; v_direction text; v_kind text; v_ref text; v_observation text;
 v_total integer; v_added record;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  return pg_catalog.jsonb_build_object('ok',false,'error','Signed-in CRM owner required');
 end if;
 v_access:=golden_private.crm_company_context(p_scan_id);
 if coalesce(v_access->>'status','') <> 'matched' then
  return pg_catalog.jsonb_build_object('ok',false,'error','CRM ownership and exact company match required');
 end if;
 if p_action='list' then
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)),'[]'::jsonb) into v_records
  from (select id,hypothesis_id,direction,evidence_kind,source_reference,observation,reviewed_by,created_at
        from public.golden_triangulation_reviews
        where scan_id=p_scan_id and reviewed_by=v_owner
        order by created_at desc limit 100) t;
  return pg_catalog.jsonb_build_object('ok',true,'records',v_records);
 elsif p_action='add' then
  if p_record is null or coalesce(p_record->>'operator_reviewed','')<>'true' then
    return pg_catalog.jsonb_build_object('ok',false,'error','Explicit source review required');
  end if;
  v_hypothesis:=pg_catalog.btrim(coalesce(p_record->>'hypothesis_id',''));
  v_direction:=pg_catalog.btrim(coalesce(p_record->>'direction',''));
  v_kind:=pg_catalog.btrim(coalesce(p_record->>'evidence_kind',''));
  v_ref:=pg_catalog.btrim(coalesce(p_record->>'source_reference',''));
  v_observation:=pg_catalog.btrim(coalesce(p_record->>'observation',''));
  if v_hypothesis not in ('lead-response','buyer-reassurance','choice-friction','internal-handoff',
      'mobile-conversion','channel-attribution','verified-financial-impact')
     or v_direction not in ('supports','challenges')
     or v_kind not in ('crm','operations','analytics','calls','customer_feedback','other')
     or pg_catalog.length(v_ref) not between 3 and 300
     or pg_catalog.length(v_observation) not between 16 and 2400 then
    return pg_catalog.jsonb_build_object('ok',false,'error','Valid evidence and source reference required');
  end if;
  select count(*) into v_total from public.golden_triangulation_reviews
   where scan_id=p_scan_id and reviewed_by=v_owner;
  if v_total>=100 then return pg_catalog.jsonb_build_object('ok',false,'error','Review limit reached'); end if;
  insert into public.golden_triangulation_reviews
   (scan_id,hypothesis_id,direction,evidence_kind,source_reference,observation,reviewed_by)
  values (p_scan_id,v_hypothesis,v_direction,v_kind,v_ref,v_observation,v_owner)
  on conflict do nothing
  returning id,hypothesis_id,direction,evidence_kind,source_reference,observation,reviewed_by,created_at into v_added;
  if not found then return pg_catalog.jsonb_build_object('ok',false,'error','Duplicate reviewed source'); end if;
  return pg_catalog.jsonb_build_object('ok',true,'record',pg_catalog.to_jsonb(v_added));
 else
  return pg_catalog.jsonb_build_object('ok',false,'error','Invalid action');
 end if;
end;
$$;

create or replace function public.golden_scoped_crm_preview_rpc(p_scan_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select golden_private.crm_company_context(p_scan_id); $$;
create or replace function public.golden_scoped_crm_review_rpc(p_scan_id uuid,p_action text,p_record jsonb default null)
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select golden_private.crm_review_action(p_scan_id,p_action,p_record); $$;

revoke all on function golden_private.crm_company_context(uuid) from public,anon,authenticated;
revoke all on function golden_private.crm_review_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function golden_private.crm_company_context(uuid) to authenticated;
grant execute on function golden_private.crm_review_action(uuid,text,jsonb) to authenticated;
revoke all on function public.golden_scoped_crm_preview_rpc(uuid) from public,anon,authenticated;
revoke all on function public.golden_scoped_crm_review_rpc(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.golden_scoped_crm_preview_rpc(uuid) to authenticated;
grant execute on function public.golden_scoped_crm_review_rpc(uuid,text,jsonb) to authenticated;
comment on function public.golden_scoped_crm_preview_rpc(uuid) is
 'Owner-scoped exact-domain read-only CRM preview. No Edge Functions.';
comment on function public.golden_scoped_crm_review_rpc(uuid,text,jsonb) is
 'Owner-scoped private human-reviewed evidence, not published or used for canonical report pricing.';
notify pgrst,'reload schema';