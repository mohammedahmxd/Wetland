import assert from 'node:assert/strict';
import {resources,departments,matchingResources,connectionConfig,BRAND_ENDPOINT,seedCatalogue,saveResource as writeResource,deleteResource as removeResource,restoreResource as recoverResource,catalogueDepartments,saveDepartment as writeDepartment,deleteDepartment as removeDepartment} from './public/resource-catalogue.js';
const saveResource=(c,input,id)=>writeResource(c,input,id,'staff');
const deleteResource=(c,id)=>removeResource(c,id,'staff');
const restoreResource=(c,id)=>recoverResource(c,id,'staff');
const saveDepartment=(c,input,id)=>writeDepartment(c,input,id,'staff');
const deleteDepartment=(c,id,destination)=>removeDepartment(c,id,destination,'staff');

assert.equal(new Set(resources.map(r=>r.id)).size,resources.length);
assert.equal(resources.filter(r=>r.status==='Available').length,1);
for(const r of resources){
  assert(departments.some(d=>d.id===r.department));
  if(r.status==='Planned'){assert.equal(r.endpoint,null);assert.equal(connectionConfig(r),null);}
  else {assert.equal(r.endpoint,BRAND_ENDPOINT);assert.equal(connectionConfig(r).mcpServers[r.id].url,BRAND_ENDPOINT);}
}
assert.equal(matchingResources('FUNDRAISING').length,3);
assert.deepEqual(matchingResources('  giving summary  ').map(r=>r.id),['donor-crm']);
assert.equal(matchingResources('translation','Available').length,0);
assert.equal(matchingResources('','Planned').length,11);
assert.equal(matchingResources('no-such-resource').length,0);
console.log('PASS: departmental search, status filters and connection configs exclude unprovisioned concepts.');
let catalogue=seedCatalogue();
const input={title:'Test service',department:'it',description:'Find reviewed operational guidance.',owner:'IT team',data:'Public guidance',permissions:'Read only',setup:'Connect with the endpoint.',prompt:'Find a source.',methods:'find_source, get_version\nfind_source',status:'Planned',endpoint:'',authentication:'No authentication',transport:'Streamable HTTP',referenceUrl:''};
const added=saveResource(catalogue,input);
assert.equal(catalogue.items.length,13);assert.deepEqual(added.methods,['find_source','get_version']);
assert.equal(matchingResources('test service','All',catalogue.items).length,1);
const updated=saveResource(catalogue,{...input,title:'Updated service',status:'Available',endpoint:'https://example.org/mcp',transport:'SSE'},added.id);
assert.equal(updated.id,added.id);assert.equal(catalogue.items.length,13);
assert.equal(connectionConfig(updated).mcpServers[added.id].type,'sse');
catalogue=JSON.parse(JSON.stringify(catalogue));
assert.equal(catalogue.items.find(r=>r.id===added.id).title,'Updated service');
assert.throws(()=>saveResource(catalogue,{...input,status:'Available'}),/needs an endpoint/);
assert.throws(()=>saveResource(catalogue,{...input,endpoint:'javascript:alert(1)'}),/HTTP or HTTPS/);
assert.throws(()=>saveResource(catalogue,{...input,referenceUrl:'https://secret:password@example.org'}),/credentials/);
assert.throws(()=>saveResource(catalogue,{...input,department:'unknown'}),/department/);
assert.throws(()=>saveResource(catalogue,{...input,methods:'<script>'}),/method names/);
assert.equal(catalogue.items.length,13);
deleteResource(catalogue,added.id);assert.equal(catalogue.items.length,12);
assert.equal(matchingResources('updated service','All',catalogue.items).length,0);
assert.equal(catalogue.deleted[0].resource.prompt,input.prompt);
assert.throws(()=>deleteResource(catalogue,added.id),/already been deleted/);
catalogue=JSON.parse(JSON.stringify(catalogue));restoreResource(catalogue,added.id);
assert.equal(catalogue.items.length,13);assert.equal(catalogue.deleted.length,0);
assert.equal(catalogue.items.find(r=>r.id===added.id).endpoint,'https://example.org/mcp');
assert.equal(resources.length,12);
console.log('PASS: MCP create/edit/delete/restore, persisted records, URL validation and immutable seed data.');
const legacy={items:structuredClone(resources),deleted:[]};
assert.equal(catalogueDepartments(legacy).length,4);
assert.equal(legacy.items.length,12);
const group=saveDepartment(legacy,{title:'Research',description:'Research tools',position:2});
assert.equal(legacy.departments[1].id,group.id);
assert.deepEqual(legacy.departments.map(d=>d.number),['01','02','03','04','05']);
const moved=saveResource(legacy,{...input,department:group.id});
saveDepartment(legacy,{title:'Research & evidence',description:'Reviewed research',position:1},group.id);
assert.equal(legacy.departments[0].id,group.id);
assert.equal(matchingResources('research evidence','All',legacy.items,legacy.departments).length,1);
assert.throws(()=>saveDepartment(legacy,{title:'research & evidence',position:1}),/already exists/);
assert.throws(()=>saveDepartment(legacy,{title:'',position:1}),/name/);
assert.throws(()=>saveDepartment(legacy,{title:'Invalid position',position:99}),/position/);
assert.throws(()=>deleteDepartment(legacy,group.id),/Choose another department/);
assert.equal(legacy.items.find(r=>r.id===moved.id).department,group.id);
deleteResource(legacy,moved.id);
assert.throws(()=>deleteDepartment(legacy,group.id),/Choose another department/);
deleteDepartment(legacy,group.id,'support');
restoreResource(legacy,moved.id);
assert.equal(legacy.items.find(r=>r.id===moved.id).department,'support');
assert.deepEqual(legacy.departments.map(d=>d.number),['01','02','03','04']);
const empty={items:[],deleted:[],departments:[]};
const first=saveDepartment(empty,{title:'First',position:1});
assert.equal(first.number,'01');deleteDepartment(empty,first.id);assert.equal(empty.departments.length,0);
assert.equal(JSON.parse(JSON.stringify(legacy)).departments.length,4);
assert.equal(departments[0].title,'Fundraising & donor relations');
console.log('PASS: department migration, CRUD, ordering, renamed search and safe reassignment of active/deleted MCPs.');

for(const role of ['contributor','reviewer',undefined]){
 const state=seedCatalogue(),before=JSON.stringify(state);
 assert.throws(()=>writeResource(state,input,undefined,role),/Only staff/);
 assert.throws(()=>writeResource(state,input,'donor-crm',role),/Only staff/);
 assert.throws(()=>removeResource(state,'donor-crm',role),/Only staff/);
 assert.throws(()=>recoverResource(state,'donor-crm',role),/Only staff/);
 assert.throws(()=>writeDepartment(state,{title:'Blocked',position:1},undefined,role),/Only staff/);
 assert.throws(()=>removeDepartment(state,'fundraising','it',role),/Only staff/);
 assert.equal(JSON.stringify(state),before);
}
console.log('PASS: non-staff and missing roles cannot mutate catalogue data.');
