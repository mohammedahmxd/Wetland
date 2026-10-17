import http from 'node:http';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readPackage} from '../packages/mcp-runtime/index.mjs';
import {draft,evaluate,apply} from './candidates.mjs';
if(process.env.K_SERVICE||process.env.NODE_ENV==='production')throw Error('Authoring studio is local-only');
const root=path.resolve(process.argv[2]||'.');await readPackage(root);
const token=randomBytes(32).toString('hex');const port=Number(process.env.STUDIO_PORT||8090);let busy=false;
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Wetland MCP Studio</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#151435;font:16px system-ui}header{background:#006bd9;color:white;padding:26px 5vw}header p{margin:8px 0 0}main{max-width:1160px;margin:auto;padding:28px}section{background:white;border:1px solid #dce2ea;border-radius:12px;padding:24px;margin-bottom:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}label{display:block;margin:16px 0 6px;font-weight:600}input,textarea{width:100%;padding:12px;border:1px solid #a8b3c4;border-radius:6px;font:inherit}textarea{font:14px ui-monospace,monospace;line-height:1.5}button{padding:12px 18px;border:0;border-radius:6px;background:#006bd9;color:white;font:inherit;cursor:pointer;margin:8px 8px 0 0}button:last-child{background:#151435}button:disabled{opacity:.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:380px;overflow:auto}small{color:#535d70}.notice{border-left:5px solid #006bd9;padding:14px;background:#eaf3ff}h2{margin-top:0}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:16px}}</style></head><body><header><strong>WETLAND · MCP STUDIO</strong><p>Edit a draft. Prove the result. Review before release.</p></header><main><p class="notice">Local authoring workspace. Changes apply to your Git working files only. Team review and deployment happen through a pull request.</p><form id="editor"><div class="grid"><section><h2>Package identity</h2><small id="identity"></small><label for="name">Display name</label><input id="name" required maxlength="200"><label for="owner">Owner</label><input id="owner" required maxlength="200"><label for="version">Release version</label><input id="version" required pattern="[0-9]+\\.[0-9]+\\.[0-9]+"><label for="description">Description</label><textarea id="description" rows="3" required></textarea><label for="config">Validated configuration (JSON)</label><textarea id="config" rows="8" required></textarea></section><section><h2>Reporting and knowledge guidance</h2><p>Change language and instructions here. Counting rules, tool code and permissions require developer review.</p><label for="guidance">Guidance document</label><textarea id="guidance" rows="23" required></textarea></section></div><section><h2>Test and apply</h2><p>Save before testing. Tests run against an isolated copy. Applying requires passing tests for the exact saved draft and unchanged working files.</p><button type="submit">1. Save draft</button><button type="button" id="evaluate">2. Run tests</button><button type="button" id="apply">3. Apply tested draft</button><button type="button" id="reload">Reload working files</button><p id="status" role="status"></p><pre id="log"></pre></section></form></main><script>
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);let original;
const $=id=>document.getElementById(id);
async function call(action,value){const res=await fetch('/api/'+action,{method:action==='state'?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:action==='state'?undefined:JSON.stringify(value||{})});const data=await res.json();if(!res.ok)throw Error(data.error);return data;}
async function reload(){original=await call('state');for(const id of ['name','owner','version','description'])$(id).value=original.manifest[id];$('identity').textContent=original.manifest.id+' · '+original.manifest.dataClassification;$('config').value=JSON.stringify(original.config,null,2);$('guidance').value=original.guidance;}
async function action(fn){document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){$('status').textContent=e.message;}finally{document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
$('editor').onsubmit=e=>{e.preventDefault();action(async()=>{const manifest={...original.manifest};for(const id of ['name','owner','version','description'])manifest[id]=$(id).value;await call('draft',{value:{manifest,config:JSON.parse($('config').value),guidance:$('guidance').value},expectedDigest:original.digest});$('status').textContent='Draft saved. Run tests before applying.';$('log').textContent='';});};
$('evaluate').onclick=()=>action(async()=>{$('status').textContent='Running candidate tests…';const r=await call('evaluate');$('status').textContent=r.passed?'Tests passed for the saved draft.':'Tests failed. Revise and save the draft.';$('log').textContent=r.log;});
$('apply').onclick=()=>action(async()=>{const r=await call('apply');$('status').textContent=r.message;await reload();});
$('reload').onclick=()=>action(reload);action(reload);
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
 const respond=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(req.url==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",'Cache-Control':'no-store'});return res.end(html);}
 const auth=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+token);
 if(auth.length!==expected.length||!timingSafeEqual(auth,expected))return respond(401,{error:'Open the studio URL printed in your terminal.'});
 const origin=`http://127.0.0.1:${server.address().port}`;
 if(req.headers.origin&&req.headers.origin!==origin)return respond(403,{error:'Origin not allowed'});
 if(req.url==='/api/state'&&req.method==='GET')return respond(200,await readPackage(root));
 if(req.method!=='POST')return respond(405,{error:'Method not allowed'});if(busy)return respond(409,{error:'Another operation is running'});busy=true;
 try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)throw Error('Draft too large');}const body=JSON.parse(raw||'{}');let result;
  if(req.url==='/api/draft')result=await draft(root,body.value,body.expectedDigest);
  else if(req.url==='/api/evaluate')result=await evaluate(root);
  else if(req.url==='/api/apply')result=await apply(root);
  else return respond(404,{error:'Unknown operation'});
  respond(200,result);
 }catch(e){respond(400,{error:e.message});}finally{busy=false;}
});
server.requestTimeout=15000;server.listen(port,'127.0.0.1',()=>console.log(`Local MCP studio: http://127.0.0.1:${server.address().port}/#${token}`));
