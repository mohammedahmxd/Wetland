import assert from 'node:assert/strict';
import {resources,departments,matchingResources,connectionConfig,BRAND_ENDPOINT,seedCatalogue,saveResource,deleteResource,restoreResource} from './public/resource-catalogue.js';
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
