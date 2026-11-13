create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create table contacts (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 organisation text not null default '', email text not null default '', country text not null default '',
 purpose text not null default '', retention_review date, security_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table samples (
 id uuid primary key default gen_random_uuid(), barcode text not null unique check(length(trim(barcode))>0),
 name text not null check(length(trim(name))>0), style text not null default '', brand text not null default '',
 season text not null default '', colour text not null default '', size text not null default '',
 home_location text not null default '', state text not null default 'active' check(state in ('active','quarantine','archived','written_off')),
 condition text not null default 'good' check(condition in ('good','damaged','missing')),
 source_data jsonb not null default '{}', imported_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table loans (
 id uuid primary key default gen_random_uuid(), code text not null unique check(length(trim(code))>0),
 contact_id uuid not null references contacts, purpose text not null check(length(trim(purpose))>0),
 starts_on date not null, due_on date not null, terms_ref text not null default '',
 shipping_ref text not null default '', destination text not null default '',
 state text not null default 'reserved' check(state in ('reserved','out','closed','cancelled')),
 dispatched_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(due_on>=starts_on), check(dispatched_on is null or dispatched_on>=starts_on)
);
create table loan_items (
 id uuid primary key default gen_random_uuid(), loan_id uuid not null references loans,
 sample_id uuid not null references samples, returned_on date, return_condition text check(return_condition in ('good','damaged')),
 return_location text, lost_on date, loss_reason text, loss_proof text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(loan_id,sample_id), check((returned_on is null)=(return_condition is null)),
 check(returned_on is null or lost_on is null),
 check(lost_on is null or (length(trim(loss_reason))>0 and length(trim(loss_proof))>0 and loss_reason is not null and loss_proof is not null))
);
create table stocktakes (
 id uuid primary key default gen_random_uuid(), sample_id uuid not null references samples,
 observed_on date not null default current_date, location text not null, condition text not null check(condition in ('good','damaged','missing')),
 note text not null default '', actor text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), sample_id uuid not null references samples,
 note text not null check(length(trim(note))>0), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table activity (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null,
 action text not null, actor text not null, snapshot jsonb not null, created_at timestamptz not null default now()
);
create function audit_record() returns trigger language plpgsql as $$
declare who text:=current_setting('app.actor',true);
begin
 if coalesce(trim(who),'')='' then raise exception 'Named actor required'; end if;
 insert into activity(entity,record_id,action,actor,snapshot) values(TG_TABLE_NAME,new.id,TG_OP,who,to_jsonb(new));return new;
end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'History is append-only'; end $$;
create trigger protect_activity before update or delete on activity for each row execute function immutable_record();
create trigger protect_stocktakes before update or delete on stocktakes for each row execute function immutable_record();
create trigger protect_notes before update or delete on notes for each row execute function immutable_record();
create function guard_item() returns trigger language plpgsql as $$
declare l loans; s samples;
begin
 if TG_OP='UPDATE' then
   if new.loan_id<>old.loan_id or new.sample_id<>old.sample_id or old.returned_on is not null or old.lost_on is not null then raise exception 'Custody history cannot be rewritten'; end if;
   select * into l from loans where id=new.loan_id;
   if l.state<>'out' or coalesce(new.returned_on,new.lost_on)<l.dispatched_on then raise exception 'Only dispatched items can be received'; end if;
   return new;
 end if;
 select * into l from loans where id=new.loan_id;
 select * into s from samples where id=new.sample_id for update;
 if l.state<>'reserved' then raise exception 'Only reserved loans accept items'; end if;
 if s.state<>'active' or s.condition<>'good' then raise exception 'Sample is not available for reservation'; end if;
 if exists(select 1 from loan_items i join loans x on x.id=i.loan_id where i.sample_id=new.sample_id and i.returned_on is null and i.lost_on is null and x.state in ('reserved','out') and x.starts_on<=l.due_on and x.due_on>=l.starts_on) then
   raise exception 'Overlapping reservation for sample %',s.barcode;
 end if;
 return new;
end $$;
create trigger item_guard before insert or update on loan_items for each row execute function guard_item();
create index loan_items_sample_idx on loan_items(sample_id);
create index loans_due_idx on loans(due_on);
create index stocktakes_sample_idx on stocktakes(sample_id,observed_on);
do $$ declare t text; begin
 foreach t in array array['contacts','samples','loans','loan_items','stocktakes','notes'] loop
  execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
  execute format('create trigger audit after insert or update on %I for each row execute function audit_record()',t);
  execute format('create trigger prevent_delete before delete on %I for each row execute function immutable_record()',t);
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public',t);
 end loop;
 alter table activity enable row level security; revoke all on activity from public;
end $$;
create view v_custody as
select i.id item_id,s.id sample_id,s.barcode,s.name,s.brand,s.season,l.id loan_id,l.code,c.name recipient,c.organisation,
l.purpose,l.starts_on,l.due_on,l.dispatched_on,l.state,l.terms_ref,l.shipping_ref,l.destination,
i.returned_on,i.return_condition,i.return_location,i.lost_on,i.loss_reason,i.loss_proof,
case when l.state='out' and i.returned_on is null and i.lost_on is null then greatest(current_date-l.due_on,0) else 0 end overdue_days
from loan_items i join samples s on s.id=i.sample_id join loans l on l.id=i.loan_id join contacts c on c.id=l.contact_id;
create view v_inventory as
select s.*,
(select code from v_custody c where c.sample_id=s.id and c.state='out' and c.returned_on is null and c.lost_on is null limit 1) out_on,
(select max(observed_on) from stocktakes t where t.sample_id=s.id) last_counted,
(select max(dispatched_on) from v_custody c where c.sample_id=s.id) last_sent,
(select count(*)::int from v_custody c where c.sample_id=s.id and c.dispatched_on is not null) loan_count
from samples s;
create view v_reservations as
select c.code,c.barcode,c.name,c.recipient,c.starts_on,c.due_on,
case when s.state<>'active' or s.condition<>'good' then 'Condition or inventory hold'
when exists(select 1 from v_custody x where x.sample_id=c.sample_id and x.state='out' and x.returned_on is null and x.lost_on is null) then 'Still with another borrower'
when c.starts_on<current_date then 'Dispatch date passed' else 'Ready subject to physical check' end readiness
from v_custody c join samples s on s.id=c.sample_id where c.state='reserved';
create view v_attention as
select 'Overdue return' issue,code reference,barcode sample,recipient owner,due_on due from v_custody where state='out' and returned_on is null and lost_on is null and due_on<current_date
union all select readiness,code,barcode,recipient,starts_on from v_reservations where readiness<>'Ready subject to physical check'
union all select 'Stocktake due',barcode,barcode,home_location,coalesce(last_counted,created_at::date)+30 from v_inventory where state='active' and out_on is null and coalesce(last_counted,created_at::date)<current_date-30
union all select 'Inventory hold',barcode,barcode,home_location,null::date from samples where state='quarantine' or condition<>'good';
create view v_recipient_reliability as
select c.id,c.name,c.organisation,count(v.item_id)::int item_loans,
count(v.item_id) filter(where v.state='out' and v.returned_on is null and v.lost_on is null)::int outstanding,
count(v.item_id) filter(where v.overdue_days>0)::int overdue,
count(v.item_id) filter(where v.returned_on>v.due_on)::int returned_late,
count(v.item_id) filter(where v.return_condition='damaged')::int damaged_returns,
count(v.item_id) filter(where v.lost_on is not null)::int recorded_losses
from contacts c left join loans l on l.contact_id=c.id left join v_custody v on v.loan_id=l.id group by c.id;
