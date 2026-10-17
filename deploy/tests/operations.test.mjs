import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plan,checkService} from '../release.mjs';
import {decodeRpc,validateGrowth} from '../check-services.mjs';
const service='wetland-growth-kpi-demo';
const image=`northamerica-northeast2-docker.pkg.dev/wateraid-flow/web/${service}@sha256:${'a'.repeat(64)}`;
test('Release rejects mutable tags, foreign service images and unknown flags',()=>{
 for(const args of [['deploy',service,image.replace(/@.*/,':latest')],['deploy','wateraid-brand-hub',image],['deploy',service,image,'--allow-unauthenticated'],['rollback',service,'other-00001-abc']])assert.throws(()=>plan(args));
 const p=plan(['deploy',service,image]);assert.equal(p.apply,false);
 assert.ok(!p.command.some(x=>/env|iam|service-account/.test(x)));
});
test('Release rejects split or pinned traffic and preserves rollback evidence',()=>{
 const p=plan(['deploy',service,image]);
 const state={metadata:{name:service},status:{latestReadyRevisionName:'old',traffic:[{percent:100,latestRevision:true}]}};
 assert.equal(checkService(state,p).previousRevision,'old');
 state.status.traffic[0].latestRevision=false;assert.throws(()=>checkService(state,p));
});
test('Smoke checks detect transport, tool and calculation failures',()=>{
 const payload={jsonrpc:'2.0',id:1,result:{structuredContent:{actual:120}}};
 assert.equal(validateGrowth(decodeRpc('event: message\ndata: '+JSON.stringify(payload)+'\n\n')).actual,120);
 assert.throws(()=>decodeRpc(JSON.stringify({id:1,result:{isError:true}})));
 assert.throws(()=>validateGrowth({structuredContent:{actual:119}}));
 assert.throws(()=>decodeRpc('invalid response'));
});
