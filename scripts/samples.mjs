#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table } from './lib/format.mjs';
export const readQueries={
 inventory:`select id,barcode,name,brand,season,colour,size,home_location,state,condition,out_on,last_counted,loan_count from v_inventory order by barcode`,
 contacts:`select * from contacts order by name,id`,
 loans:`select l.*,c.name recipient from loans l join contacts c on c.id=l.contact_id order by l.starts_on,l.code`,
 'returns-due':`select code,barcode,name,recipient,due_on,overdue_days from v_custody where state='out' and returned_on is null and lost_on is null order by due_on,barcode`,
 'pull-list':`select * from v_reservations where starts_on<=current_date+7 order by starts_on,code,barcode`,
 reservations:`select * from v_reservations order by starts_on,code,barcode`,
 attention:`select * from v_attention order by due nulls last,reference,sample`,
 'stocktake-due':`select barcode,name,home_location,last_counted,out_on,state,condition from v_inventory where state='active' and out_on is null and coalesce(last_counted,created_at::date)<current_date-30 order by barcode`,
 'idle-samples':`select barcode,name,brand,season,home_location,last_sent,loan_count from v_inventory where state='active' and out_on is null and coalesce(last_sent,created_at::date)<current_date-60 order by barcode`,
 utilisation:`select barcode,name,brand,season,loan_count,last_sent,condition,state from v_inventory order by loan_count desc,barcode`,
 'recipient-history':`select name,organisation,item_loans,outstanding,overdue,returned_late,damaged_returns,recorded_losses from v_recipient_reliability order by overdue desc,returned_late desc,name,id`,
 'collection-review':`select brand,season,count(*)::int samples,count(*) filter(where out_on is not null)::int out,count(*) filter(where condition<>'good' or state='quarantine')::int held,sum(loan_count)::int loans from v_inventory group by brand,season order by brand,season`,
 compliance:`select name,'PURPOSE' rule,'Record why this contact is needed' issue,'https://www.privacy.org.nz/privacy-principles/9/' source from contacts where trim(purpose)=''
 union all select name,'RETENTION_REVIEW','Review whether personal details are still needed','https://www.privacy.org.nz/privacy-principles/9/' from contacts where retention_review is null or retention_review<current_date
 union all select name,'ACCESS_EVIDENCE','Record the access safeguards review','https://www.privacy.org.nz/privacy-principles/5/' from contacts where trim(security_ref)=''
 union all select name,'AU_RETENTION','Assess APP applicability and retention need','https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information' from contacts where upper(country)='AU' and (retention_review is null or retention_review<current_date)
 union all select code,'LOAN_TERMS','Record agreed custody terms before dispatch','Local operating policy, docs/compliance.md' from loans where state in ('reserved','out') and trim(terms_ref)='' order by name,rule`,
 audit:`select entity,record_id,action,actor,created_at from activity order by created_at desc,id limit 100`
};
export const recipes={
 inventory:'List each physical sample and its recorded custody.',contacts:'Read recipients and their privacy review records.',loans:'Read reservations and dispatched loans.',
 card:'Read one sample and its complete loan, stocktake and note history.',
 'returns-due':'Prepare the daily sample callback list.','pull-list':'Prepare this week\'s reserved samples and check readiness.',reservations:'Review the forward reservation book.',
 attention:'Triage late returns, missed dispatches, holds and stale stocktakes.','stocktake-due':'Plan a physical count of samples recorded at home.','idle-samples':'Find pieces unused for sixty days.',
 utilisation:'Review how often each individual sample has circulated.','recipient-history':'Review outstanding items, late returns and damage by recipient.','collection-review':'Prepare the end-of-season collection review.',
 compliance:'Review privacy evidence and custody terms against cited rules.',audit:'Read recorded operators and recent changes.','weekly-review':'Prepare Monday\'s review from returns, pulls, stocktakes and holds.',
 add:'Register a sample or recipient.','set-contact':'Update the stated purpose and privacy review evidence.',reserve:'Reserve a physical sample for a recipient and date range.','add-item':'Add another sample to a reserved loan.',
 'record-loss':'Record an authorised loss with supporting evidence without inventing a return.',dispatch:'Record a physical handover after all readiness checks pass.',receive:'Record all or selected returned items and their condition.',cancel:'Cancel an undispatched reservation.',stocktake:'Record a physical observation and reconcile an inventory hold.',
 'set-terms':'Record the agreed custody terms before dispatch.',retire:'Archive or write off a sample that has no active commitments.',log:'Append a note to the sample history.',
 import:'Import mapped Launchmetrics inventory into a reconciliation hold.',export:'Export every record as a local snapshot and CSV files.',
 'draft-callback':'Draft a local callback note from outstanding loan items.','draft-weekly-review':'Write the weekly review to a local draft.',
 customise:'Change fields or rules through a tested forward migration.','new-view':'Add a branded read-only report.'
};
const tables=['contacts','samples','loans','loan_items','stocktakes','notes','activity'];
const fields={sample:['barcode','name','style','brand','season','colour','size','home_location'],contact:['name','organisation','email','country','purpose','retention_review','security_ref']};
const day=()=>new Date().toISOString().slice(0,10);
function required(v,key){if(typeof v!=='string'||!v.trim())throw Error(`Missing ${key}`);return v.trim();}
function date(v,key='date'){required(v,key);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ${key}: use YYYY-MM-DD`);return v;}
function parse(args){const a=[],o={};for(const x of args){if(!x.startsWith('--'))a.push(x);else{const [k,...v]=x.slice(2).split('=');if(k in o)throw Error(`Duplicate option ${k}`);o[k]=v.length?v.join('='):true;}}return {a,o};}
const allowed={card:[],add:['data'],'set-contact':['data'],reserve:['contact','code','from','due','purpose','terms','destination'],'add-item':['sample'],dispatch:['shipping'],'record-loss':['sample','reason','proof'],receive:['sample','condition','location'],cancel:[],stocktake:['condition','location','note'],'set-terms':['terms'],retire:['state','reason','proof'],log:['note'],import:['file','map','as-of','dry-run'],export:['out'],'draft-callback':[],'draft-weekly-review':[],'weekly-review':[],help:[]};
async function resolve(db,table,ref,lock=false){required(ref,table+' reference');const col=table==='samples'?'barcode':table==='loans'?'code':'name';const rows=await db.query(`select * from ${table} where lower(${col})=lower($1) or id::text=$1 order by id${lock?' for update':''}`,[ref]);if(rows.length===1)return rows[0];if(rows.length>1)throw Error('Ambiguous '+table+':\n'+rows.map(r=>r.id+' '+r[col]).join('\n'));const fuzzy=await db.query(`select * from ${table} where starts_with(lower(id::text),lower($1)) or position(lower($1) in lower(${col}))>0 ${table==='samples'?'or position(lower($1) in lower(name))>0':''} order by ${col},id${lock?' for update':''}`,[ref]);if(fuzzy.length!==1)throw Error(fuzzy.length?'Ambiguous '+table+':\n'+fuzzy.map(r=>r.id+' '+r[col]+(r.name?' '+r.name:'')).join('\n'):'No matching '+table);return fuzzy[0];}
function data(o,kind){let d;try{d=JSON.parse(required(o.data,'--data'));}catch(e){throw Error('Invalid --data object: '+e.message);}if(!d||Array.isArray(d)||typeof d!=='object')throw Error('--data must be an object');for(const [k,v] of Object.entries(d)){if(!fields[kind].includes(k))throw Error('Unsupported field '+k);if(v!==null&&typeof v!=='string')throw Error('Expected text for '+k);if(v===null&&k!=='retention_review')throw Error('Null not allowed for '+k);if(k==='retention_review'&&v!==null)date(v,k);}return d;}
async function insert(db,table,d){const keys=Object.keys(d);return (await db.query(`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(d)))[0];}
async function update(db,table,id,d){const keys=Object.keys(d);if(!keys.length)throw Error('No fields to update');return (await db.query(`update ${table} set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(d),id]))[0];}
export function decodeImport(file,mapFile){
 const rows=parseCsv(fs.readFileSync(file,'utf8'));
 const map=mapFile?JSON.parse(fs.readFileSync(mapFile,'utf8')):{barcode:'Barcode',name:'Description',style:'Style Number',brand:'Brand',season:'Season',colour:'Color',size:'Size',home_location:'Location'};
 if(!map||typeof map!=='object'||Array.isArray(map))throw Error('Mapping must be an object');
 for(const [k,v] of Object.entries(map))if(!fields.sample.includes(k)||typeof v!=='string'||!v)throw Error('Unsupported mapping '+k);
 if(!map.barcode||!map.name)throw Error('Map barcode and name');
 const seen=new Set();return rows.map((row,i)=>{for(const header of Object.values(map))if(!(header in row))throw Error(`Row ${i+2}: missing mapped column ${header}`);
 const d=Object.fromEntries(Object.entries(map).map(([k,h])=>[k,row[h].trim()]));required(d.barcode,'barcode');required(d.name,'description');
 if(seen.has(d.barcode))throw Error('Duplicate barcode '+d.barcode);seen.add(d.barcode);return {...d,source_data:row};});
}
export function pretty(v){
 if(Array.isArray(v)){
  if(!v.length)return '(none)';
  const keys=Object.keys(v[0]);
  return table(v,keys.map(key=>({key,label:key.replaceAll('_',' '),format:value=>(typeof value==='object'&&value!==null?JSON.stringify(value):String(value??'')).replace(/\s+/g,' ')})));
 }
 if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>typeof x==='object'?'\n'+k+'\n'+pretty(x):k+': '+x).join('\n');
 return String(v);
}
async function snapshot(db){const out={};for(const t of tables)out[t]=await db.query(`select * from ${t} order by id`);return out;}
function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]);const q=x=>'"'+String(typeof x==='object'&&x!==null?JSON.stringify(x):x??'').replace(/"/g,'""')+'"';return [keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n')+'\r\n';}
async function inner(db,args){const {a,o}=parse(args);const [cmd='help',ref,extra]=a;
 if(!(cmd in allowed)&&!(cmd in readQueries))throw Error('Unknown command '+cmd);
 for(const k of Object.keys(o))if(!['json','actor',...(allowed[cmd]||[])].includes(k))throw Error('Unknown option --'+k);
 if(extra)throw Error('Unexpected positional argument '+extra);
 if(cmd==='help')return {commands:recipes,syntax:['add sample|contact --data=JSON --actor=NAME','reserve SAMPLE --contact=RECIPIENT --code=CODE --from=YYYY-MM-DD --due=YYYY-MM-DD --purpose=TEXT [--terms=REF] [--destination=TEXT] --actor=NAME','add-item LOAN --sample=SAMPLE --actor=NAME','dispatch LOAN --shipping=REF --actor=NAME','receive LOAN [--sample=SAMPLE] --condition=good|damaged --location=TEXT --actor=NAME','stocktake SAMPLE --condition=good|damaged|missing --location=TEXT [--note=TEXT] --actor=NAME','set-contact CONTACT --data=JSON --actor=NAME','set-terms LOAN --terms=REF --actor=NAME','record-loss LOAN --sample=SAMPLE --reason=TEXT --proof=REFERENCE --actor=NAME','cancel LOAN --actor=NAME','retire SAMPLE --state=archived|written_off --reason=TEXT --proof=REF --actor=NAME','log SAMPLE --note=TEXT --actor=NAME','import launchmetrics --file=inventory.csv [--map=mapping.json] --as-of=YYYY-MM-DD [--dry-run] --actor=NAME','export --out=NEW_DIRECTORY','card SAMPLE','draft-callback LOAN','draft-weekly-review']};
 if(cmd in readQueries){if(ref)throw Error('This read takes no reference');return db.query(readQueries[cmd]);}
 if(cmd==='weekly-review'||cmd==='draft-weekly-review'){const result={returns_due:await inner(db,['returns-due']),pull_list:await inner(db,['pull-list']),stocktake_due:await inner(db,['stocktake-due']),attention:await inner(db,['attention']),privacy:await inner(db,['compliance'])};if(cmd==='weekly-review')return result;return draft('weekly-review',result);}
 if(cmd==='card'){const sample=await resolve(db,'samples',ref);return {sample,custody:await db.query('select * from v_custody where sample_id=$1 order by starts_on,code',[sample.id]),stocktakes:await db.query('select * from stocktakes where sample_id=$1 order by observed_on',[sample.id]),notes:await db.query('select * from notes where sample_id=$1 order by created_at',[sample.id])};}
 if(cmd==='export'){const dir=path.resolve(required(o.out,'--out'));const records=await snapshot(db);fs.mkdirSync(dir,{recursive:false,mode:0o700});fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify({version:1,at:new Date().toISOString(),records},null,2)+'\n',{mode:0o600});for(const [t,rows] of Object.entries(records))fs.writeFileSync(path.join(dir,t+'.csv'),csv(rows),{mode:0o600});return {directory:dir,counts:Object.fromEntries(Object.entries(records).map(([t,r])=>[t,r.length])),note:'CSV preserves literal values. Import spreadsheet columns as text; snapshot.json is the canonical backup.'};}
 if(cmd==='draft-callback'){const l=await resolve(db,'loans',ref);const items=await db.query("select barcode,name,recipient,due_on,overdue_days from v_custody where loan_id=$1 and state='out' and returned_on is null and lost_on is null order by barcode",[l.id]);if(!items.length)throw Error('No outstanding dispatched items');return draft('callback-'+l.code,{loan:l.code,items,note:'Please arrange the return of the listed samples. Confirm the draft with the operator before any message leaves this folder.'});}
 const actor=required(o.actor,'--actor');await db.query("select set_config('app.actor',$1,true)",[actor]);
 if(cmd==='add'){if(!fields[ref])throw Error('add accepts sample or contact');const d=data(o,ref);required(d.name,'name');if(ref==='sample')required(d.barcode,'barcode');return insert(db,ref==='sample'?'samples':'contacts',d);}
 if(cmd==='set-contact'){const c=await resolve(db,'contacts',ref,true);return update(db,'contacts',c.id,data(o,'contact'));}
 if(cmd==='import'){
  if(ref!=='launchmetrics')throw Error('Use import launchmetrics');const asOf=date(o['as-of'],'--as-of');if(asOf>day())throw Error('Export date cannot be in the future');
  const rows=decodeImport(required(o.file,'--file'),o.map);let imported=0,unchanged=0;
  for(const row of rows){const old=await db.query('select * from samples where barcode=$1 for update',[row.barcode]);if(old.length){const same=await db.query('select source_data=$1::jsonb as same from samples where id=$2',[JSON.stringify(row.source_data),old[0].id]);if(!same[0].same)throw Error('Changed existing barcode '+row.barcode+': reconcile explicitly; import never overwrites custody');unchanged++;continue;}
   await insert(db,'samples',{...row,source_data:JSON.stringify(row.source_data),state:'quarantine',imported_on:asOf});imported++;
  }
  return {rows:rows.length,imported,unchanged,dry_run:Boolean(o['dry-run']),note:'Inventory only. Every new piece is held until its physical location and outstanding loans are reconciled. No loan history or availability inferred.'};
 }
 if(cmd==='reserve'){
  const s=await resolve(db,'samples',ref,true),c=await resolve(db,'contacts',required(o.contact,'--contact'));date(o.from,'--from');date(o.due,'--due');if(o.from<day())throw Error('New reservations cannot start in the past');
  const l=await insert(db,'loans',{code:required(o.code,'--code'),contact_id:c.id,purpose:required(o.purpose,'--purpose'),starts_on:o.from,due_on:o.due,terms_ref:o.terms||'',destination:o.destination||''});await insert(db,'loan_items',{loan_id:l.id,sample_id:s.id});return l;
 }
 if(cmd==='add-item'){const l=await resolve(db,'loans',ref,true),s=await resolve(db,'samples',required(o.sample,'--sample'),true);return insert(db,'loan_items',{loan_id:l.id,sample_id:s.id});}
 if(['set-terms','dispatch','receive','record-loss','cancel'].includes(cmd)){
  const l=await resolve(db,'loans',ref,true);const items=await db.query('select i.*,s.barcode,s.state sample_state,s.condition from loan_items i join samples s on s.id=i.sample_id where i.loan_id=$1 order by s.id for update of i,s',[l.id]);
  if(cmd==='set-terms'){if(l.state!=='reserved')throw Error('Terms are frozen after dispatch');return update(db,'loans',l.id,{terms_ref:required(o.terms,'--terms')});}
  if(cmd==='cancel'){if(l.state!=='reserved')throw Error('Only an undispatched reservation can be cancelled');return update(db,'loans',l.id,{state:'cancelled'});}
  if(cmd==='dispatch'){
   if(l.state!=='reserved'||!items.length)throw Error('Dispatch requires a reserved loan with items');if(l.starts_on>day()||l.due_on<day())throw Error('Dispatch is outside the reserved dates');required(l.terms_ref,'agreed loan terms');required(l.destination,'destination');
   for(const i of items){if(i.sample_state!=='active'||i.condition!=='good')throw Error('Sample condition or inventory hold: '+i.barcode);if((await db.query("select 1 from v_custody where sample_id=$1 and state='out' and returned_on is null and lost_on is null",[i.sample_id])).length)throw Error('Sample is still out: '+i.barcode);}
   return update(db,'loans',l.id,{state:'out',dispatched_on:day(),shipping_ref:required(o.shipping,'--shipping')});
  }
  if(cmd==='record-loss'){
   if(l.state!=='out')throw Error('Only dispatched loans can record a loss');
   const sample=await resolve(db,'samples',required(o.sample,'--sample'));const i=items.find(x=>x.sample_id===sample.id&&!x.returned_on&&!x.lost_on);
   if(!i)throw Error('No outstanding matching item');
   await update(db,'loan_items',i.id,{lost_on:day(),loss_reason:required(o.reason,'--reason'),loss_proof:required(o.proof,'--proof')});
   await update(db,'samples',sample.id,{state:'written_off',condition:'missing'});
   const left=(await db.query('select count(*)::int n from loan_items where loan_id=$1 and returned_on is null and lost_on is null',[l.id]))[0].n;
   if(!left)await update(db,'loans',l.id,{state:'closed'});return {code:l.code,barcode:sample.barcode,recorded_loss:true,outstanding:left};
  }
  if(l.state!=='out')throw Error('Only dispatched loans can be received');const condition=required(o.condition,'--condition');if(!['good','damaged'].includes(condition))throw Error('A missing item has not been received');const location=required(o.location,'--location');let selected=items.filter(i=>!i.returned_on&&!i.lost_on);if(o.sample){const s=await resolve(db,'samples',o.sample);selected=selected.filter(i=>i.sample_id===s.id);}if(!selected.length)throw Error('No outstanding matching item');
  for(const i of selected){await update(db,'loan_items',i.id,{returned_on:day(),return_condition:condition,return_location:location});await update(db,'samples',i.sample_id,{condition,home_location:location});}
  const left=(await db.query('select count(*)::int n from loan_items where loan_id=$1 and returned_on is null and lost_on is null',[l.id]))[0].n;if(left===0)await update(db,'loans',l.id,{state:'closed'});return {code:l.code,received:selected.map(i=>i.barcode),outstanding:left};
 }
 const s=await resolve(db,'samples',ref,true);
 if(cmd==='log')return insert(db,'notes',{sample_id:s.id,note:required(o.note,'--note'),actor});
 if(cmd==='stocktake'){
  if(s.state==='written_off'||s.state==='archived')throw Error('Retired samples need an explicit reviewed migration to reactivate');
  if((await db.query("select 1 from v_custody where sample_id=$1 and state='out' and returned_on is null and lost_on is null",[s.id])).length)throw Error('Sample is still out: receive it first');
  const condition=required(o.condition,'--condition');if(!['good','damaged','missing'].includes(condition))throw Error('Invalid condition');const location=required(o.location,'--location');const record=await insert(db,'stocktakes',{sample_id:s.id,location,condition,note:o.note||'',actor});await update(db,'samples',s.id,{condition,home_location:location,state:condition==='missing'?'quarantine':'active'});return record;
 }
 if(cmd==='retire'){
  if(!['archived','written_off'].includes(o.state))throw Error('Use archived or written_off');if((await db.query("select 1 from v_custody where sample_id=$1 and state in ('reserved','out') and returned_on is null and lost_on is null",[s.id])).length)throw Error('Sample has active commitments');
  await insert(db,'notes',{sample_id:s.id,note:required(o.reason,'--reason')+' | Evidence: '+required(o.proof,'--proof'),actor});return update(db,'samples',s.id,{state:o.state});
 }
 throw Error('Unknown operation');
}
function draft(name,data){const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,name.replace(/[^a-z0-9_-]/gi,'-')+'-'+Date.now()+'.md');fs.writeFileSync(file,'# Draft for review\n\nNothing sent.\n\n'+pretty(data)+'\n',{flag:'wx',mode:0o600});return {file};}
export async function execute(db,args){const {a,o}=parse(args);const mutation=['add','set-contact','reserve','add-item','dispatch','receive','record-loss','cancel','stocktake','set-terms','retire','log','import'].includes(a[0]);await db.exec(mutation?'BEGIN':'BEGIN READ ONLY');try{const result=await inner(db,args);await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await execute(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):pretty(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
