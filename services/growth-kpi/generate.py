"""Deterministic synthetic export; no real donor data. Python standard library only."""
import csv,json,hashlib
from pathlib import Path
from datetime import date,timedelta
root=Path(__file__).parent/'data'
root.mkdir(exist_ok=True)
people=[];gifts=[];payments=[];splits=[];soft=[]
def person(i,created):
 cid=f'C{i:05}'
 people.append([str(i),cid,f'Synthetic Donor {i:03}', 'Organization' if i%20==0 else 'Individual',created,'Yes' if i%3 else 'No','No'])
 return str(i)
def gift(cid,day,kind='Cash',status='Received',amount=5000):
 parent=''
 if kind in ['Pay-Cash','Recurring Gift Pay-Cash']:
  parent=gift(cid,day,'Pledge' if kind=='Pay-Cash' else 'Recurring Gift')
 gid=str(10000+len(gifts)); n=len(gifts)
 gifts.append([gid,f'G{gid}',cid,day,kind,f'{amount/100:.2f}','CAD','Not posted' if n%7==0 else 'Posted','' if n%7==0 else day,'Credit card',parent])
 splits.extend([[f'{gid}-1',gid,'CMP-GROWTH','F-WATER','A-DIGITAL',f'{amount*0.6/100:.2f}'],[f'{gid}-2',gid,'CMP-GROWTH','F-HYGIENE','A-DIGITAL',f'{amount*0.4/100:.2f}']])
 if kind not in ['Pledge','Recurring Gift']:
  payments.append([f'P{gid}',gid,day,status,f'{amount/100:.2f}'])
 return gid
# Existing donors with lifetime history, including reactivated donors.
for i in range(1,251):
 day=(date(2023,1,1)+timedelta(days=i%700)).isoformat();cid=person(i,day);gift(cid,day)
 if i<=180:gift(cid,'2026-08-15','Recurring Gift Pay-Cash')
# Previous-quarter first-time donors: 90.
for i in range(251,341):
 day=(date(2026,4,1)+timedelta(days=(i-251)%91)).isoformat();cid=person(i,'2025-11-01' if i%5==0 else day);gift(cid,day);gift(cid,'2026-08-20')
# Demo-quarter first-time donors: 120; some pre-existing prospects.
for i in range(341,461):
 day=(date(2026,7,1)+timedelta(days=(i-341)%92)).isoformat();cid=person(i,'2025-12-01' if i%4==0 else day);gift(cid,day,'Pay-Cash' if i%6==0 else 'Cash');gift(cid,'2026-09-30')
# Forty new CRM records with no qualifying receipt as of quarter end.
for i in range(461,501):
 cid=person(i,'2026-08-01')
 if i<=470: gift(cid,'2026-08-02','Pledge')
 elif i<=480: gift(cid,'2026-08-02',status='Declined')
 elif i<=490:
  gid=gift(cid,'2026-08-02');payments.append([f'R{gid}',gid,'2026-09-01','Refunded','50.00'])
 else: soft.append([f'SC{i}','10000',cid,'50.00'])
# Later conversion, excluded from Q3 but visible in Q4.
gift('461','2026-10-05','Pay-Cash')
# Known merged duplicate: first-ever date still comes from canonical donor 1.
people.append(['901','C00901','Synthetic Duplicate 001','Individual','2026-07-01','No','No'])
gift('901','2026-09-02')
tables={
 'constituents.csv':(['System record ID','Constituent ID','Name','Constituent type','Date added','Email opt-in','Do not solicit'],people),
 'gifts.csv':(['System record ID','Gift ID','Constituent System record ID','Gift date','Gift type','Amount','Currency','Post status','Post date','Payment method','Applied to gift System record ID'],gifts),
 'gift_splits.csv':(['Split ID','Gift System record ID','Campaign ID','Fund ID','Appeal ID','Split amount'],splits),
 'payment_events.csv':(['Event ID','Gift System record ID','Event date','Outcome','Amount'],payments),
 'soft_credits.csv':(['Soft credit ID','Gift System record ID','Constituent System record ID','Amount'],soft),
 'constituent_merges.csv':(['Alias System record ID','Canonical System record ID'],[['901','1']]),
 'campaigns.csv':(['Campaign ID','Description','Goal amount','Currency'],[['CMP-GROWTH','Synthetic donor growth campaign','100000.00','CAD']])}
for name,(headers,rows) in tables.items():
 with (root/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f);w.writerow(headers);w.writerows(rows)
manifest={'dataset_id':'synthetic-re-growth-v1','synthetic':True,'exported_at':'2026-10-17','history_start':'2023-01-01','complete_lifetime_history':True,'history_note':'Synthetic organization begins 2023-01-01. All gifts since inception are supplied. This assertion must be verified for real exports.','currency':'CAD','demo':{'start':'2026-07-01','end':'2026-09-30','target':150,'expected_new_donors':120,'previous_quarter_new_donors':90},'files':{name:{'rows':len(rows),'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name,(_,rows) in tables.items()}}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Generated synthetic export:',len(people),'constituent records;',len(gifts),'gifts')
