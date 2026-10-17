import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function boundedFetch(url,{fetchImpl=fetch,headers={},method='GET',body,limit=3_000_000}={}){
 const response=await fetchImpl(url,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Brand dependency returned HTTP '+response.status);
 const chunks=[];let size=0;
 for await(const chunk of response.body||[]){size+=chunk.length;if(size>limit)throw Error('Brand response exceeds limit');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
export async function loadBrand({endpoint,fetchImpl=fetch,token,allowLocal=false}={}){
 const base=new URL(endpoint||process.env.BRAND_MCP_URL||'https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp');
 if((base.protocol!=='https:'&&!(allowLocal&&base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))||base.username||base.password||base.search||base.hash||base.pathname!=='/mcp')throw Error('Invalid configured Brand endpoint');
 const headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token}:{})};let id=0,protocol='2025-03-26';
 const rpc=async(method,params)=>{const bytes=await boundedFetch(base,{fetchImpl,headers:{...headers,'MCP-Protocol-Version':protocol},method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})});let message;try{message=JSON.parse(bytes);}catch{throw Error('Brand must return JSON for this stateless connection');}if(message.error||!message.result)throw Error('Brand MCP request failed');return message.result;};
 const init=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'wetland-reporting',version:'0.1.0'}});protocol=init.protocolVersion;
 await boundedFetch(base,{fetchImpl,headers:{...headers,'MCP-Protocol-Version':protocol},method:'POST',body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
 const tool=async(name,args={})=>{const result=await rpc('tools/call',{name,arguments:args});if(result.isError)throw Error('Brand tool failed: '+name);return result.structuredContent||JSON.parse(result.content[0].text);};
 // Fixed read-only requests only. No donor data, report text or caller token is forwarded.
 const system=await tool('get_brand_system'),ui=await tool('get_ui_guidance'),guidance=await tool('get_document_guidance'),catalog=await tool('list_assets');
 if(!catalog.assets?.some(a=>a.id==='white-logo'))throw Error('Required Brand logo is missing');
 const logo=await tool('get_asset',{id:'white-logo'});
 if(!guidance.profile?.version||!guidance.instructions||!guidance.tokens?.colors||!logo.asset)throw Error('Incomplete Brand document contract');
 if(JSON.stringify(system.tokens)!==JSON.stringify(guidance.tokens)||JSON.stringify(ui.tokens)!==JSON.stringify(guidance.tokens))throw Error('Brand changed during retrieval; retry');
 for(const key of ['blue','ink','lime','cream','white','muted'])if(!/^#[0-9a-f]{6}$/i.test(guidance.tokens.colors[key]?.value||''))throw Error('Invalid Brand palette');
 const assetUrl=logo.asset.pngs?.find(p=>p.width===1280)?.url;if(!assetUrl)throw Error('Print-resolution logo missing');
 const asset=async(url)=>{const target=new URL(url,base);if(target.origin!==base.origin||target.username||target.password)throw Error('Brand asset outside approved origin');return boundedFetch(target,{fetchImpl});};
 const [png,regular,bold,black,license]=await Promise.all([asset(assetUrl),asset('/fonts/noto-sans-regular.ttf'),asset('/fonts/noto-sans-bold.ttf'),asset('/fonts/noto-sans-black.ttf'),asset('/fonts/OFL.txt')]);
 if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid logo image');
 const hashes={logo:digest(png),regular:digest(regular),bold:digest(bold),black:digest(black),license:digest(license)};
 const evidence={endpoint:base.href,serverVersion:init.serverInfo?.version||'unversioned',profileVersion:guidance.profile.version,tokenVersion:guidance.tokens.version,packageVersion:guidance.packageVersion||null,packageDigest:guidance.packageDigest||null,status:guidance.profile.status,hashes,guidanceDigest:digest(JSON.stringify({system,ui,guidance,logo}))};
 evidence.snapshotDigest=digest(JSON.stringify(evidence));
 return {guidance,evidence,png,regular,bold,black,license};
}
