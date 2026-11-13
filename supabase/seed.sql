do $$ begin
if exists(select 1 from samples where barcode='DEMO-001') then return; end if;
perform set_config('app.actor','Demo seed',true);
insert into contacts(id,name,organisation,email,country,purpose,retention_review,security_ref) values
('10000000-0000-4000-8000-000000000001','Mia Chen','Harbour Editorial','mia@example.test','NZ','Arrange sample loans',current_date+90,'local://access-review'),
('10000000-0000-4000-8000-000000000002','Alex Reid','Southern Styling','alex@example.test','AU','Arrange sample loans',current_date-4,''),
('10000000-0000-4000-8000-000000000003','Alex Ross','Studio West','','NZ','',null,'');
insert into samples(id,barcode,name,style,brand,season,colour,size,home_location,created_at) values
('20000000-0000-4000-8000-000000000001','DEMO-001','Linen jacket','J100','Harbour Label','Summer 2027','Sand','M','Rack A',now()-interval '100 days'),
('20000000-0000-4000-8000-000000000002','DEMO-002','Linen jacket','J100','Harbour Label','Summer 2027','Navy','M','Rack A',now()-interval '100 days'),
('20000000-0000-4000-8000-000000000003','DEMO-003','Canvas tote','B200','Harbour Label','Summer 2027','Cream','One size','Shelf B',now()-interval '100 days'),
('20000000-0000-4000-8000-000000000004','DEMO-004','Wool coat','C300','Southern Thread','Winter 2026','Black','L','Archive',now()-interval '100 days'),
('20000000-0000-4000-8000-000000000005','DEMO-005','Silk scarf','S400','Southern Thread','Summer 2027','Blue','One size','Shelf B',now()-interval '100 days'),
('20000000-0000-4000-8000-000000000006','DEMO-006','Leather belt','A500','Southern Thread','Summer 2027','Brown','M','Shelf C',now()-interval '100 days');
insert into loans(id,code,contact_id,purpose,starts_on,due_on,terms_ref,destination) values
('30000000-0000-4000-8000-000000000001','PRESS-101','10000000-0000-4000-8000-000000000001','Summer editorial shoot',current_date-14,current_date-3,'local://loan-101','Harbour studio'),
('30000000-0000-4000-8000-000000000002','PRESS-102','10000000-0000-4000-8000-000000000002','Lookbook shoot',current_date-8,current_date+2,'local://loan-102','Southern studio'),
('30000000-0000-4000-8000-000000000003','RES-201','10000000-0000-4000-8000-000000000003','Next week cover',current_date+1,current_date+5,'','West studio'),
('30000000-0000-4000-8000-000000000004','PRESS-099','10000000-0000-4000-8000-000000000002','Prior season campaign',current_date-50,current_date-40,'local://loan-099','Southern studio');
insert into loan_items(loan_id,sample_id) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004');
update loans set state='out',dispatched_on=starts_on where code like 'PRESS-%';
update loan_items set returned_on=current_date-35,return_condition='damaged',return_location='Archive' where loan_id='30000000-0000-4000-8000-000000000004';
update loans set state='closed' where code='PRESS-099';
update samples set condition='damaged' where barcode='DEMO-004';
update samples set state='quarantine' where barcode='DEMO-006';
insert into stocktakes(sample_id,observed_on,location,condition,actor) values
('20000000-0000-4000-8000-000000000005',current_date-45,'Shelf B','good','Demo operator');
end $$;
