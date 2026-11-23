-- Review queue for connecting existing Golden Reports to the same company's
-- account-owned CRM company record. No automatic associations or paid calls.
-- Admin status AND connected CRM ownership are checked on each request.
create table if not exists public.golden_crm_verified_links (
  scan_id uuid primary key references public.forensic_scans(id) on delete cascade,
  crm_account_id uuid not null references public.accounts(id) on delete cascade,
  crm_company_id uuid not null references public.mirror_companies(id) on delete cascade,
  verified_by uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);
create index if not exists golden_crm_verified_links_account_idx
  on public.golden_crm_verified_links(crm_account_id,verified_at desc);
alter table public.golden_crm_verified_links enable row level security;
revoke all on public.golden_crm_verified_links from public,anon,authenticated;
grant select,insert,delete on public.golden_crm_verified_links to service_role;
comment on table public.golden_crm_verified_links is
  'Explicit administrator-reviewed CRM company-to-report associations; never automatic.';

create or replace function golden_private.crm_match_queue(p_limit integer default 20,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_verified integer;
  v_rows jsonb;
begin
  if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not public.is_admin(v_user) then
    return jsonb_build_object('ok',false,'error','Signed-in Aetheris administrator required');
  end if;
  if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 5000 then
    return jsonb_build_object('ok',false,'error','Invalid page size or offset');
  end if;

  -- Only scan domains that exist in the caller's *own* connected CRM account.
  -- Duplicate company records remain ambiguous; no automatic selection.
  with owned as materialized (
    select m.id,m.account_id,m.name,
      lower(regexp_replace(btrim(coalesce(m.domain,'')),'^www[.]','','i')) as host
    from public.mirror_companies m
    join public.accounts a on a.id=m.account_id
    where a.user_id=v_user and a.hubspot_connected_at is not null
      and a.hubspot_refresh_token_encrypted is not null and m.domain is not null
  ), scans as materialized (
    select s.id,s.created_at,s.status,s.company_name as report_company_name,s.creator_user_id,
      lower(regexp_replace(split_part(split_part(
        regexp_replace(coalesce(s.target_url,''),'^https?://','','i'), '/',1),'?',1),
        '^www[.]','','i')) as host
    from public.forensic_scans s
    where s.creator_user_id is null or s.creator_user_id=v_user
  ), found as materialized (
    select s.id as scan_id,s.created_at,s.status,s.report_company_name,s.host as domain,
      m.id as company_id,m.account_id,m.name as crm_company_name,
      count(*) over(partition by s.id) as company_matches,
      row_number() over(partition by s.id order by m.id) as company_rank
    from scans s join owned m on m.host=s.host
    where s.host ~ '^[a-z0-9-]+([.][a-z0-9-]+)+$'
  ), unique_scans as materialized (
    select f.scan_id,f.created_at,f.status,f.report_company_name,f.domain,f.company_id,f.account_id,
      f.crm_company_name,f.company_matches,
      (v.scan_id is not null and v.crm_company_id=f.company_id
        and v.crm_account_id=f.account_id and v.verified_by=v_user) as verified
    from found f
    left join public.golden_crm_verified_links v on v.scan_id=f.scan_id
    where f.company_rank=1
  )
  select count(*),count(*) filter(where verified)
  into v_total,v_verified from unique_scans;

  with owned as materialized (
    select m.id,m.account_id,m.name,
      lower(regexp_replace(btrim(coalesce(m.domain,'')),'^www[.]','','i')) as host
    from public.mirror_companies m
    join public.accounts a on a.id=m.account_id
    where a.user_id=v_user and a.hubspot_connected_at is not null
      and a.hubspot_refresh_token_encrypted is not null and m.domain is not null
  ), scans as materialized (
    select s.id,s.created_at,s.status,s.company_name as report_company_name,
      lower(regexp_replace(split_part(split_part(
        regexp_replace(coalesce(s.target_url,''),'^https?://','','i'), '/',1),'?',1),
        '^www[.]','','i')) as host
    from public.forensic_scans s
    where s.creator_user_id is null or s.creator_user_id=v_user
  ), found as materialized (
    select s.id as scan_id,s.created_at,s.status,s.report_company_name,s.host as domain,
      m.id as company_id,m.account_id,m.name as crm_company_name,
      count(*) over(partition by s.id) as company_matches,
      row_number() over(partition by s.id order by m.id) as company_rank
    from scans s join owned m on m.host=s.host
    where s.host ~ '^[a-z0-9-]+([.][a-z0-9-]+)+$'
  )
  select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc),'[]'::jsonb)
  into v_rows from (
    select f.scan_id,f.created_at,f.status,f.report_company_name,f.domain,f.company_id,f.crm_company_name,
      f.company_matches,
      (v.scan_id is not null and v.crm_company_id=f.company_id
        and v.crm_account_id=f.account_id and v.verified_by=v_user) as verified
    from found f
    left join public.golden_crm_verified_links v on v.scan_id=f.scan_id
    where f.company_rank=1
    order by f.created_at desc limit p_limit offset p_offset
  ) p;

  return jsonb_build_object('ok',true,'total',v_total,
    'verified',v_verified,'candidates',v_rows);
end;
$$;

create or replace function golden_private.crm_confirm_link(
  p_scan_id uuid,p_company_id uuid,p_action text,p_confirm boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_context jsonb;
  v_account uuid;
  v_insert uuid;
begin
  if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not public.is_admin(v_user) then
    return jsonb_build_object('ok',false,'error','Signed-in Aetheris administrator required');
  end if;
  if not coalesce(p_confirm,false) or p_action not in ('verify','revoke') then
    return jsonb_build_object('ok',false,'error','Explicit verification decision required');
  end if;
  -- Revocation must still work after a report or CRM company changes domain.
  -- Only the administrator who owns this exact previously verified link may revoke.
  if p_action='revoke' then
    delete from public.golden_crm_verified_links l using public.accounts a
      where l.scan_id=p_scan_id and l.crm_account_id=a.id
        and l.crm_company_id=p_company_id and l.verified_by=v_user
        and a.user_id=v_user;
    return jsonb_build_object('ok',true,'verified',false,'revoked',found);
  end if;
  -- Verify requires fresh ownership and an exact unambiguous domain match.
  v_context:=golden_private.crm_company_context(p_scan_id);
  if coalesce(v_context->>'status','')<>'matched'
    or (v_context->'preview'->>'company_record_id') is distinct from p_company_id::text then
    return jsonb_build_object('ok',false,'error','Owner/domain/ambiguity verification failed');
  end if;
  select a.id into v_account from public.mirror_companies m
    join public.accounts a on a.id=m.account_id
    where m.id=p_company_id and a.user_id=v_user
      and a.hubspot_connected_at is not null
      and a.hubspot_refresh_token_encrypted is not null;
  if v_account is null then
    return jsonb_build_object('ok',false,'error','Connected CRM account does not belong to user');
  end if;

  insert into public.golden_crm_verified_links
    (scan_id,crm_account_id,crm_company_id,verified_by)
  values (p_scan_id,v_account,p_company_id,v_user)
  on conflict(scan_id) do nothing returning scan_id into v_insert;
  if v_insert is null then
    if exists(select 1 from public.golden_crm_verified_links
        where scan_id=p_scan_id and crm_account_id=v_account
          and crm_company_id=p_company_id and verified_by=v_user) then
      return jsonb_build_object('ok',true,'verified',true,'already_verified',true);
    end if;
    return jsonb_build_object('ok',false,'error','Report is already linked to a different company or owner');
  end if;
  return jsonb_build_object('ok',true,'verified',true);
end;
$$;

create or replace function public.golden_crm_match_queue_rpc(p_limit integer default 20,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path = ''
as $$select golden_private.crm_match_queue(p_limit,p_offset);$$;

create or replace function public.golden_crm_confirm_link_rpc(
  p_scan_id uuid,p_company_id uuid,p_action text,p_confirm boolean default false)
returns jsonb language sql volatile security invoker set search_path = ''
as $$select golden_private.crm_confirm_link(p_scan_id,p_company_id,p_action,p_confirm);$$;

revoke all on function golden_private.crm_match_queue(integer,integer) from public,anon,authenticated;
revoke all on function golden_private.crm_confirm_link(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function golden_private.crm_match_queue(integer,integer) to authenticated;
grant execute on function golden_private.crm_confirm_link(uuid,uuid,text,boolean) to authenticated;
revoke all on function public.golden_crm_match_queue_rpc(integer,integer) from public,anon,authenticated;
revoke all on function public.golden_crm_confirm_link_rpc(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.golden_crm_match_queue_rpc(integer,integer) to authenticated;
grant execute on function public.golden_crm_confirm_link_rpc(uuid,uuid,text,boolean) to authenticated;
notify pgrst,'reload schema';
