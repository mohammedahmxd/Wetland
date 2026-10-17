import assert from 'node:assert/strict';
import {ensureCatalogue} from './public/resource-migration.js';
import {CATALOGUE_VERSION,resources,departments,seedCatalogue} from './public/resource-catalogue.js';

// A fresh browser gets the team's current layout, not the retired catalogue.
const fresh=ensureCatalogue();
assert.deepEqual(fresh,seedCatalogue());
assert.equal(fresh.version,CATALOGUE_VERSION);
assert.deepEqual(fresh.departments,departments);
fresh.items[0].title='Local edit';assert.notEqual(resources[0].title,'Local edit');

for(const version of [undefined,1,2,3,4,5]){
  const saved={version,items:[{id:'brand-system',department:'brand',title:'Our edited brand',endpoint:'https://team.example/mcp'}, {id:'our-tool',department:'our-group',title:'Custom tool'}],deleted:[{resource:{id:'growth-reporting',department:'brand',title:'Deleted Growth'},deletedAt:'2026-10-17'}],departments:[{id:'our-group',number:'01',title:'Our team',description:'Custom group'},{id:'brand',number:'02',title:'Renamed brand',description:'Local description'}],officialResourcesVersion:1};
  const expected=structuredClone(saved);expected.version=CATALOGUE_VERSION;
  const state={role:'contributor',projects:[{id:'team-project'}],events:[{message:'Work completed'}],resourceCatalogue:saved};
  const others=JSON.stringify({...state,resourceCatalogue:undefined});
  assert.equal(ensureCatalogue(saved),saved);
  assert.deepEqual(saved,expected);
  assert.equal(JSON.stringify({...state,resourceCatalogue:undefined}),others);
  const once=JSON.stringify(saved);
  assert.equal(JSON.stringify(ensureCatalogue(JSON.parse(once))),once);
  // Deleting an entry after migration must remain a deletion on the next load.
  saved.deleted.push({resource:saved.items.shift(),deletedAt:'2026-10-18'});
  const afterDelete=JSON.stringify(saved);ensureCatalogue(saved);
  assert.equal(JSON.stringify(saved),afterDelete);
}

const noGroups={items:[{id:'old',department:'fundraising'}],deleted:[{resource:{id:'removed',department:'brand'}}]};
ensureCatalogue(noGroups);
assert.deepEqual(noGroups.departments.map(d=>d.id),['fundraising','brand']);
assert.equal(noGroups.departments[0].title,'Fundraising & donor relations');
assert.equal(noGroups.items[0].id,'old');assert.equal(noGroups.deleted[0].resource.id,'removed');
const empty={version:2,items:[],deleted:[],departments:[]};
ensureCatalogue(empty);assert.deepEqual(empty,{version:CATALOGUE_VERSION,items:[],deleted:[],departments:[]});
const future={...seedCatalogue(),version:CATALOGUE_VERSION+1};
const futureSnapshot=JSON.stringify(future);ensureCatalogue(future);assert.equal(JSON.stringify(future),futureSnapshot);
const malformed={version:1,items:{important:'keep this'},deleted:[]};
const malformedSnapshot=JSON.stringify(malformed);
assert.throws(()=>ensureCatalogue(malformed),/Export the browser session/);
assert.equal(JSON.stringify(malformed),malformedSnapshot);
console.log('PASS: catalogue upgrades preserve edits, custom entries, deleted records, department layout and other workspace state; fresh users receive current seeds.');

// Existing v5 records receive corrected defaults, but only for unchanged fields.
const {v5Defaults}=await import('./public/resource-catalogue-v5.js');
const v5={version:5,items:structuredClone(v5Defaults),deleted:[],departments:structuredClone(departments)};
const untouchedId=v5.items.find(item=>item.id.startsWith('example-')).id;
const edited=v5.items.find(item=>item.id==='growth-reporting');
assert.ok(edited,'The previous catalogue includes Growth');
edited.description='Our carefully edited Growth explanation';
edited.setup='Our local connection procedure';
const removed=v5.items.splice(v5.items.findIndex(item=>item.id==='branding'),1)[0];
v5.deleted.push({resource:removed,deletedAt:'2026-10-17'});
const trash=structuredClone(v5.deleted);
v5.items.push({id:'custom',department:'live',description:'Team custom'});
const beforeCount=v5.items.length;
ensureCatalogue(v5);
assert.equal(v5.items.length,beforeCount);
assert.deepEqual(v5.deleted,trash);
assert.equal(v5.items.some(item=>item.id==='branding'),false);
assert.equal(edited.description,'Our carefully edited Growth explanation');
assert.equal(edited.setup,'Our local connection procedure');
assert.equal(v5.items.at(-1).description,'Team custom');
if(CATALOGUE_VERSION>=6){
  assert.deepEqual(v5.items.find(item=>item.id===untouchedId),resources.find(item=>item.id===untouchedId));
  assert.deepEqual(edited.methods,resources.find(item=>item.id==='growth-reporting').methods);
  assert.equal(edited.referenceUrl,resources.find(item=>item.id==='growth-reporting').referenceUrl);
  assert.ok(edited.referenceUrl,'The new Excel demo reference is added to existing default records');
}
const migratedSnapshot=JSON.stringify(v5);ensureCatalogue(v5);
assert.equal(JSON.stringify(v5),migratedSnapshot);
console.log('PASS: v5 default correction merges unchanged fields only and preserves edits, trash and custom entries.');

const customReference={version:5,items:[{...structuredClone(v5Defaults.find(item=>item.id==='growth-reporting')),referenceUrl:'https://team.example/our-guide'}],deleted:[],departments:structuredClone(departments)};
ensureCatalogue(customReference);
assert.equal(customReference.items[0].referenceUrl,'https://team.example/our-guide');
console.log('PASS: new default metadata is added when absent, while custom metadata is preserved.');
