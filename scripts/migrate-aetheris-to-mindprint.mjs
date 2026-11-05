const SRC_URL = process.env.AETHERIS_URL;
const SRC_KEY = process.env.AETHERIS_SERVICE_KEY;
const DST_URL = process.env.MINDPRINT_URL;
const DST_KEY = process.env.MINDPRINT_SERVICE_KEY;
if (!SRC_URL || !SRC_KEY || !DST_URL || !DST_KEY) throw new Error("Missing migration environment");

const sourceTables = [
  "rep_leads","drip_prospects","rep_crm_leads","crm_contacts","crm_companies",
  "diagnostic_leads","assessment_leads","checklist_leads","rep_code_scan_leads","tool_leads",
  "contact_submissions","identified_visitors","mirror_contacts","mirror_companies","customers",
  "subscriber_profiles","event_signups","webinar_registrations","website_scans","forensic_scans"
];

const headers = key => ({ apikey:key, Authorization:"Bearer "+key, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=representation" });
const clean = v => typeof v === "string" && v.trim() ? v.trim() : null;
const lower = v => clean(v)?.toLowerCase() ?? null;
const domain = raw => {
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : "https://"+raw).hostname.replace(/^www\./i,"").toLowerCase(); } catch { return null; }
};
const keyFor = r => {
  const email=lower(r.email||r.contact_email||r.prospect_email||r.lead_email);
  const li=lower(r.linkedin_url||r.linkedin);
  const phone=clean(r.phone||r.contact_phone||r.prospect_phone||r.lead_phone)?.replace(/\D/g,"");
  const name=lower(r.contact_name||r.full_name||r.name||r.prospect_name||r.lead_name);
  const company=lower(r.business_name||r.company||r.company_name);
  const site=domain(r.website||r.website_url||r.target_url||r.url);
  if(email) return "email:"+email;
  if(li) return "linkedin:"+li;
  if(phone && phone.length>=10) return "phone:"+phone;
  if(name && company) return "name-company:"+name+"|"+company;
  if(site && company) return "domain-company:"+site+"|"+company;
  if(site) return "domain:"+site;
  return null;
};

async function req(url,key,init={}) {
  const r=await fetch(url,{...init,headers:{...headers(key),...(init.headers||{})}});
  const text=await r.text();
  if(!r.ok) throw new Error(r.status+" "+url+" "+text.slice(0,500));
  return text ? JSON.parse(text) : null;
}
async function fetchPage(table,offset,limit) {
  const url=`${SRC_URL}/rest/v1/${table}?select=*&order=id.asc&offset=${offset}&limit=${limit}`;
  return req(url,SRC_KEY);
}
async function upsert(table,rows,onConflict) {
  if(!rows.length) return [];
  const url=`${DST_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  return req(url,DST_KEY,{method:"POST",body:JSON.stringify(rows)});
}

function normalize(table,r) {
  const contactName=clean(r.contact_name||r.full_name||r.name||r.prospect_name||r.lead_name);
  const email=lower(r.email||r.contact_email||r.prospect_email||r.lead_email);
  const phone=clean(r.phone||r.contact_phone||r.prospect_phone||r.lead_phone);
  const company=clean(r.business_name||r.company||r.company_name||r.current_employer||r.employer);
  const website=clean(r.website||r.website_url||r.target_url||r.url);
  const linkedin=clean(r.linkedin_url||r.linkedin);
  const industry=clean(r.industry);
  const location=clean(r.location);
  const title=clean(r.title||r.role);
  const dedupe=keyFor(r);
  const ts=clean(r.updated_at||r.last_seen||r.created_at);
  return {table,r,contactName,email,phone,company,website,linkedin,industry,location,title,dedupe,ts};
}

async function migrateGeneric(table,r) {
  const n=normalize(table,r);
  if(!n.dedupe) return {skipped:1};
  const contactRows=[{
    dedupe_key:n.dedupe,full_name:n.contactName,email:n.email,phone:n.phone,linkedin_url:n.linkedin,title:n.title,
    company:n.company,website:n.website,industry:n.industry,location:n.location,notes:clean(r.notes),
    enrichment:r.enrichment||r.scraped_data||{},source_count:1,first_seen:clean(r.created_at),last_seen:n.ts
  }];
  const contacts=await upsert("mindprint_contacts",contactRows,"dedupe_key");
  const contactId=contacts?.[0]?.id||null;
  const leadRows=[{
    dedupe_key:n.dedupe,contact_id:contactId,business_name:n.company,contact_name:n.contactName,email:n.email,phone:n.phone,
    linkedin_url:n.linkedin,website:n.website,industry:n.industry,location:n.location,status:clean(r.status||r.stage||r.lead_status),
    lifecycle_stage:clean(r.lifecycle_stage),score:Number.isFinite(Number(r.score))?Number(r.score):null,score_stage:clean(r.score_stage),
    why_fit:clean(r.why_fit),notes:clean(r.notes),source_count:1,touch_count:Number(r.touch_count||0),
    last_touched_at:clean(r.last_touched_at),enrichment:r.enrichment||r.scraped_data||r.metadata||{},first_seen:clean(r.created_at),last_seen:n.ts
  }];
  const leads=await upsert("mindprint_leads",leadRows,"dedupe_key");
  const leadId=leads?.[0]?.id||null;
  await upsert("mindprint_lead_sources",[{
    lead_id:leadId,contact_id:contactId,source_table:table,source_id:String(r.id),source_kind:clean(r.source||table),
    source_status:clean(r.status||r.stage||r.lead_status),source_score:Number.isFinite(Number(r.score))?Number(r.score):null,
    source_created_at:clean(r.created_at),source_updated_at:clean(r.updated_at),payload:r
  }],"source_table,source_id");
  return {migrated:1};
}

async function migrateScan(table,r) {
  const n=normalize(table,r);
  let leadId=null,contactId=null;
  if(n.dedupe){
    const contacts=await upsert("mindprint_contacts",[{
      dedupe_key:n.dedupe,full_name:n.contactName,email:n.email,phone:n.phone,company:n.company,website:n.website,
      source_count:1,first_seen:clean(r.created_at),last_seen:n.ts,enrichment:{}
    }],"dedupe_key");
    contactId=contacts?.[0]?.id||null;
    const leads=await upsert("mindprint_leads",[{
      dedupe_key:n.dedupe,contact_id:contactId,business_name:n.company,contact_name:n.contactName,email:n.email,phone:n.phone,
      website:n.website,status:clean(r.status),source_count:1,first_seen:clean(r.created_at),last_seen:n.ts,enrichment:{}
    }],"dedupe_key");
    leadId=leads?.[0]?.id||null;
  }
  await upsert("mindprint_scan_history",[{
    source_table:table,source_id:String(r.id),lead_id:leadId,contact_id:contactId,scan_type:table==="forensic_scans"?"golden_report":"website_scan",
    company_name:n.company,contact_name:n.contactName,email:n.email,phone:n.phone,target_url:n.website,
    score:Number.isFinite(Number(r.score))?Number(r.score):null,grade:clean(r.grade),status:clean(r.status),
    scan_payload:r,scanned_at:clean(r.completed_at||r.created_at)
  }],"source_table,source_id");
  if(table==="forensic_scans"){
    await upsert("forensic_scans",[r],"id");
  }
  return {migrated:1};
}

const BATCH=table => table==="forensic_scans" ? 20 : 200;
const summary={};
for(const table of sourceTables){
  let offset=0,migrated=0,skipped=0;
  for(;;){
    let rows;
    try { rows=await fetchPage(table,offset,BATCH(table)); }
    catch(e){ console.error("SOURCE_TABLE_FAILED",table,String(e)); summary[table]={migrated,skipped,error:String(e)}; break; }
    if(!Array.isArray(rows)||!rows.length){ summary[table]={migrated,skipped}; break; }
    for(const r of rows){
      try {
        const x=(table==="forensic_scans"||table==="website_scans")?await migrateScan(table,r):await migrateGeneric(table,r);
        migrated+=x.migrated||0; skipped+=x.skipped||0;
      } catch(e){ console.error("ROW_FAILED",table,r.id,String(e)); skipped++; }
    }
    offset+=rows.length;
    console.log("PROGRESS",table,offset,migrated,skipped);
    if(rows.length<BATCH(table)){ summary[table]={migrated,skipped}; break; }
  }
}
console.log("MIGRATION_SUMMARY",JSON.stringify(summary));
