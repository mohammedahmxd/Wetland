#!/usr/bin/env node
// Explicit on-demand read-only checks; no scheduler or alert destination is installed.
import {pathToFileURL} from 'node:url';
const host='462504004653.northamerica-northeast2.run.app';
export const exampleContracts=[
 {scope:'grants',tool:'prepare_grant_outline',args:{evidenceIds:['project-brief'],requestedAmountGbp:42000}},
 {scope:'programme-reporting',tool:'analyse_programme_progress',args:{siteIds:['A','B','C']}},
 {scope:'governance',tool:'check_release_readiness',args:{ownerNamed:true,testsPassed:true,independentReview:false,dataClassification:'private',dataAccessReviewed:false}},
 {scope:'maintenance',tool:'triage_tool_maintenance',args:{minimumSeverity:'medium'}},
 {scope:'onboarding',tool:'plan_staff_onboarding',args:{role:'contributor'}},
 {scope:'communications',tool:'prepare_communications_outline',args:{channel:'email'}},
 {scope:'developer-standards',tool:'check_developer_standards',args:{completedChecks:['manifest']}},
 {scope:'learning',tool:'retrieve_organisational_learning',args:{topic:'reporting'}}
];
export function assertToolList(list,names){
 const actual=list.tools?.map(x=>x.name).sort();
 if(JSON.stringify(actual)!==JSON.stringify([...names].sort()))throw Error('MCP tool list differs from approved contract');
}
export function validateExample(result,tool){
 const data=result.structuredContent||JSON.parse(result.content.find(x=>x.type==='text').text);
 if(data.tool!==tool||data.classification!=='synthetic'||!data.packageDigest||!data.sources?.length||data.sources.some(x=>!x.uri?.startsWith('wetland://')||!x.text))throw Error('Example output missing synthetic classification or evidence');
 if(tool==='analyse_programme_progress'&&(data.actual!==90||data.target!==120))throw Error('Synthetic programme fixture totals changed');
 if(tool==='check_release_readiness'&&data.approvalGranted!==false)throw Error('Advisory tool unexpectedly grants approval');
 return data;
}
export const targets=[
 {id:'dashboard',url:`https://wetland-ai-workspace-${host}`},
 {id:'brand',url:`https://wateraid-brand-hub-${host}`,tools:['get_document_guidance','get_brand_system']},
 {id:'growth',url:`https://wetland-growth-kpi-demo-${host}`,tools:['calculate_growth','generate_growth_report']},
 {id:'examples',url:`https://wetland-examples-mcp-${host}`,tools:exampleContracts.map(x=>x.tool)}
];
export function decodeRpc(text) {
 let messages;
 try {messages=[JSON.parse(text)];}catch {messages=text.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>JSON.parse(x.slice(5).trim()));}
 const message=messages.find(x=>x.id===1);
 if(!message||message.error||message.result?.isError)throw Error('MCP response missing or returned an error');
 return message.result;
}
export function validateGrowth(result){
 const data=result.structuredContent||JSON.parse(result.content.find(x=>x.type==='text').text);
 if(data.actual!==120)throw Error('Synthetic Q3 donor count changed: expected 120');
 return data;
}
async function request(url,options={}) {
 const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error(`HTTP ${response.status}`);return response;
}
async function rpc(base,method,params,path='/mcp'){return decodeRpc(await(await request(base+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).text());}
export async function check(target,{reports=false}={}){
 if(target.id==='dashboard'){
  const response=await request(target.url+'/');
  if(!response.headers.get('content-type')?.includes('text/html')||!(await response.text()).includes('Wetland'))throw Error('Dashboard HTML missing');
  return {service:target.id,status:'ok',check:'page availability only'};
 }
 const health=await request(target.url+'/api/health');
 if(!health.headers.get('content-type')?.includes('application/json'))throw Error('Expected JSON health response');
 const healthBody=await health.json();if(healthBody.ok!==true&&healthBody.status!=='ok')throw Error('Health response not healthy');
 if(!target.tools)return {service:target.id,status:'ok'};
 const list=await rpc(target.url,'tools/list',{});
 for(const name of target.tools)if(!list.tools?.some(x=>x.name===name))throw Error(`Required tool absent: ${name}`);
 if(target.id==='examples'){
  assertToolList(list,exampleContracts.map(x=>x.tool));
  for(const contract of exampleContracts){
   const path='/mcp/'+contract.scope;
   assertToolList(await rpc(target.url,'tools/list',{},path),[contract.tool]);
   validateExample(await rpc(target.url,'tools/call',{name:contract.tool,arguments:contract.args},path),contract.tool);
   // A scoped connection must not expose another capability even by direct tool call.
   const other=exampleContracts.find(x=>x.tool!==contract.tool);
   const rejected=await request(target.url+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:other.tool,arguments:other.args}})});
   let denied=false;try{decodeRpc(await rejected.text());}catch{denied=true;}
   if(!denied)throw Error('Scoped endpoint accepted an unrelated tool');
  }
 }
 if(target.id==='brand')await rpc(target.url,'tools/call',{name:'get_document_guidance',arguments:{}});
 if(target.id==='growth'){
  const arguments_={start:'2026-07-01',end:'2026-09-30',target:150};
  validateGrowth(await rpc(target.url,'tools/call',{name:'calculate_growth',arguments:arguments_}));
  if(reports){
   const report=validateGrowth(await rpc(target.url,'tools/call',{name:'generate_growth_report',arguments:arguments_}));
   if(!report.brand||!report.artifactId)throw Error('Missing Brand provenance');
   const url=new URL(report.downloads.pdf);if(url.origin!==new URL(target.url).origin||url.pathname!=='/reports/growth.pdf')throw Error('Unexpected report URL');
   const pdf=await request(url);const bytes=new Uint8Array(await pdf.arrayBuffer());
   if(!pdf.headers.get('content-type')?.includes('application/pdf')||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF response');
  }
 }
 return {service:target.id,status:'ok',reportDependencyChecked:target.id==='growth'&&reports};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const flags=process.argv.slice(2);
 if(flags.some(x=>x!=='--reports'))throw Error('Usage: node deploy/check-services.mjs [--reports]');
 for(const target of targets){try{console.log(JSON.stringify(await check(target,{reports:flags.includes('--reports')})));}catch(error){console.log(JSON.stringify({service:target.id,status:'failed',reason:error.message}));process.exitCode=1;}}
}
