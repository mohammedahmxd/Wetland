import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base='http://127.0.0.1:8796';
const env={...process.env,PORT:'8796',PUBLIC_BASE_URL:base};
for (const key of ['AUTH_PROFILE','AUTH_EMAIL_DOMAINS','AUTH_TEST_MODE','AUTH_SIGNING_SECRET','FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN']) delete env[key];
const child=spawn(process.execPath,['server.mjs'],{env,stdio:['ignore','pipe','inherit']});
const client=new Client({name:'brand-hub-smoke-test',version:'1.0.0'});
try{
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server exited');}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),5000).unref())]);
 assert.equal((await fetch(base+'/api/health')).status,200);
 const html=await fetch(base+'/');assert.equal(html.status,200);assert.match(html.headers.get('content-type'),/text\/html/);
 await client.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp')));
 const tools=(await client.listTools()).tools;assert.equal(tools.length,5);assert.ok(tools.every(t=>t.annotations.readOnlyHint));
 const list=await client.callTool({name:'list_assets',arguments:{}});const assets=JSON.parse(list.content[0].text).assets;assert.ok(assets.length>=4);assert.ok(assets[0].localSvg.startsWith(base+'/'));assert.ok(assets[0].pngs[0].url.startsWith(base+'/'));assert.ok(assets[0].sourceSha256);
 const result=await client.callTool({name:'get_asset',arguments:{id:assets[0].id}});assert.equal(JSON.parse(result.content[0].text).asset.id,assets[0].id);
 assert.ok((await client.callTool({name:'get_asset',arguments:{id:'../../package.json'}})).isError);
 const filtered=await client.callTool({name:'list_assets',arguments:{query:'hygiene'}});assert.ok(JSON.parse(filtered.content[0].text).assets.some(a=>a.id==='hygiene'));
 for(const name of ['get_brand_system','get_ui_guidance'])assert.ok(!(await client.callTool({name,arguments:{}})).isError);
 const doc=JSON.parse((await client.callTool({name:'get_document_guidance',arguments:{}})).content[0].text);assert.ok(doc.profile.referenceUrl.startsWith(base+'/'));assert.match(doc.instructions,/Render/);for(const key of ['referenceUrl','starterUrl','instructionsUrl'])assert.equal((await fetch(doc.profile[key])).status,200);assert.equal((await fetch(doc.profile.referenceUrl)).headers.get('content-type'),'application/pdf');
 const resources=(await client.listResources()).resources;assert.equal(resources.length,4);
 for(const resource of resources){const r=await client.readResource({uri:resource.uri});assert.ok(r.contents[0].text.length>20);}
 const svg=await fetch(assets[0].localSvg);assert.equal(svg.status,200);assert.match(svg.headers.get('content-type'),/image\/svg/);
 const png=await fetch(assets[0].pngs[0].url);assert.equal(png.status,200);assert.equal(png.headers.get('content-type'),'image/png');
 assert.equal((await fetch(base+'/package.json')).status,404);
 assert.equal((await fetch(base+'/mcp')).status,405);
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{origin:'https://untrusted.example'}})).status,403);
 console.log('PASS: MCP initialize, five read-only tools and document downloads, asset filtering and absolute URLs, unknown asset rejection, four resource reads, SVG/PNG/static serving, health alias, method/origin boundaries.');
}finally{await client.close().catch(()=>{});child.kill('SIGTERM');}
