import assert from 'node:assert/strict';
import {resources,departments,matchingResources,connectionConfig,BRAND_ENDPOINT} from './public/resource-catalogue.js';
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
