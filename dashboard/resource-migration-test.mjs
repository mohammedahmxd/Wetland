import assert from 'node:assert/strict';
import {migrateCatalogue} from './public/resource-migration.js';
import {resources,departments,seedCatalogue,saveResource,deleteResource} from './public/resource-catalogue.js';

const originalIds=['donor-crm','gift-matching','grant-impact','access-directory','service-health','runbooks','supporter-faq','community-feedback','translation','brand-system','media-rights','editorial'];
const oldSeeds=resources.filter(resource=>originalIds.includes(resource.id));
assert.equal(oldSeeds.length,12);
const additions=resources.filter(resource=>!originalIds.includes(resource.id));
assert.equal(additions.length,9);

const legacy={items:structuredClone(oldSeeds),deleted:[],departments:structuredClone(departments)};
legacy.items[0].title='Our locally edited donor service';
legacy.items[0].endpoint='https://our-team.example/mcp';
deleteResource(legacy,'brand-system','admin');
legacy.items.push({...structuredClone(oldSeeds[0]),id:'our-custom-resource',title:'Team custom resource'});
legacy.departments.reverse();legacy.departments[0].title='Our communications team';
const savedItems=structuredClone(legacy.items),savedTrash=structuredClone(legacy.deleted),savedGroups=structuredClone(legacy.departments);
const state={role:'contributor',resourceCatalogue:legacy,projects:[{id:'team-project'}],events:[{message:'team change'}]};
const beforeOther=JSON.stringify({...state,resourceCatalogue:undefined});
state.resourceCatalogue=migrateCatalogue(state.resourceCatalogue);
assert.deepEqual(legacy.items.slice(0,savedItems.length),savedItems);
assert.deepEqual(legacy.deleted,savedTrash);
assert.deepEqual(legacy.departments,savedGroups);
assert.equal(legacy.items.length,savedItems.length+9);
assert.equal(legacy.items.some(r=>r.id==='brand-system'),false);
assert.equal(JSON.stringify({...state,resourceCatalogue:undefined}),beforeOther);
const once=JSON.stringify(legacy);
assert.equal(migrateCatalogue(legacy),legacy);
assert.equal(JSON.stringify(legacy),once);
assert.equal(JSON.stringify(migrateCatalogue(JSON.parse(once))),once);

// Existing entries with new official IDs are local edits too; trash is a tombstone.
const overlap={items:[{...structuredClone(additions[0]),title:'Our custom Growth'}],deleted:[{resource:structuredClone(additions[1]),deletedAt:'2026-10-16'}]};
const overlapItem=structuredClone(overlap.items[0]);
migrateCatalogue(overlap);
assert.deepEqual(overlap.items[0],overlapItem);
assert.equal(overlap.items.some(r=>r.id===additions[1].id),false);
assert.equal(overlap.items.length,8);
assert.deepEqual(overlap.departments,departments);

// A removed department must stay removed, with no invisible resource records.
const noGroups={items:[],deleted:[],departments:[]};
migrateCatalogue(noGroups);
assert.deepEqual(noGroups.items,[]);assert.deepEqual(noGroups.departments,[]);
const future={...seedCatalogue(),officialResourcesVersion:99};
const futureSnapshot=JSON.stringify(future);migrateCatalogue(future);
assert.equal(JSON.stringify(future),futureSnapshot);
const fresh=migrateCatalogue();
assert.equal(fresh.items.length,21);
fresh.items[0].title='Edited';assert.notEqual(resources[0].title,'Edited');

// Normal edits through the existing form must retain added demo metadata.
const editable=seedCatalogue(),source=editable.items.find(r=>r.id==='growth-reporting');
const {demoUrl,skillIds,synthetic,...oldForm}=source;
const edited=saveResource(editable,{...oldForm,title:'Team Growth title'},source.id,'contributor');
assert.equal(edited.demoUrl,demoUrl);assert.deepEqual(edited.skillIds,skillIds);assert.equal(edited.synthetic,synthetic);
console.log('PASS: additive resource migration preserves edits, deleted entries, departments, roles and team state; reload is idempotent and resource edits preserve demo metadata.');
const metadataSnapshot=JSON.stringify(editable);
assert.throws(()=>saveResource(editable,{...edited,demoUrl:'javascript:alert(1)'},edited.id,'admin'),/HTTP or HTTPS/);
assert.throws(()=>saveResource(editable,{...edited,demoUrl:'https://secret:password@example.org'},edited.id,'admin'),/credentials/);
assert.throws(()=>saveResource(editable,{...edited,skillIds:'<script>'},edited.id,'admin'),/skill IDs/);
assert.equal(JSON.stringify(editable),metadataSnapshot);
const formEdited=saveResource(editable,{...edited,synthetic:'true',skillIds:'growth-reporting, growth-reporting'},edited.id,'contributor');
assert.equal(formEdited.synthetic,true);assert.deepEqual(formEdited.skillIds,['growth-reporting']);
deleteResource(editable,edited.id,'admin');migrateCatalogue(editable);
assert.equal(editable.items.some(r=>r.id===edited.id),false);
console.log('PASS: demo URL/skill validation rejects unsafe metadata atomically, form values retain synthetic labels, deleted new entries stay deleted.');
