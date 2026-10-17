import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {createMcpHandler,startHttp,validateManifest} from './index.mjs';
const manifest={schemaVersion:1,id:'test-mcp',name:'Test',description:'Test',owner:'Team',version:'1.0.0',type:'knowledge',dataClassification:'synthetic'};
test('Manifest contract and private HTTP fail closed',()=>{validateManifest(manifest);assert.throws(()=>validateManifest({...manifest,id:'../../bad'}));assert.throws(()=>createMcpHandler({publicBaseUrl:'http://localhost',dataClassification:'private'}),/authorization/);});
test('HTTP transport rejects foreign origin, malformed JSON and missing authorization',async()=>{
 let calls=0;class Transport{async close(){}async handleRequest(req,res,body){calls++;res.end(JSON.stringify(body));}}
 const createServer=()=>({connect:async()=>{},close:async()=>{}});
 const handler=createMcpHandler({createServer,Transport,publicBaseUrl:'http://localhost',dataClassification:'private',authorize:async req=>req.headers.authorization==='Bearer test'});
 const s=startHttp({handler,manifest,host:'127.0.0.1',port:0});await once(s,'listening');const base='http://127.0.0.1:'+s.address().port;
 try{assert.equal((await fetch(base+'/api/health')).status,200);assert.equal((await fetch(base+'/mcp')).status,405);
 assert.equal((await fetch(base+'/mcp',{method:'POST',body:'{}'})).status,401);
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{authorization:'Bearer test',origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{authorization:'Bearer test'},body:'bad'})).status,400);
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{authorization:'Bearer test'},body:'{}'})).status,200);assert.equal(calls,1);
 }finally{s.closeAllConnections();await new Promise(r=>s.close(r));}
});
