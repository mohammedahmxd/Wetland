import {createRemoteJWKSet,jwtVerify} from 'jose';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// One service is one permission boundary. Do not use this adapter alone for mixed-access datasets.
export function createEntraAuthorizer({tenantId,audience,scope,clientIds,keySet}){
 if(!uuid.test(tenantId||'')||!uuid.test(audience||'')||!scope||!/^[\w.-]+$/.test(scope)||!clientIds?.length||clientIds.some(id=>!uuid.test(id)))throw Error('Entra requires tenant UUID, API audience UUID, delegated scope and allowed client UUIDs');
 const issuer=`https://login.microsoftonline.com/${tenantId}/v2.0`;
 const keys=keySet||createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),{timeoutDuration:5000,cooldownDuration:30000});
 return async req=>{
  const header=req.headers.authorization;
  if(typeof header!=='string'||!/^Bearer [A-Za-z0-9_.-]+$/i.test(header)||header.length>16384)return false;
  try{
   const {payload:p}=await jwtVerify(header.slice(7),keys,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','nbf','tid','oid','azp','scp'],clockTolerance:5});
   if(p.ver!=='2.0'||p.tid!==tenantId||!uuid.test(p.oid)||p.idtyp==='app'||!clientIds.includes(p.azp)||typeof p.scp!=='string'||!p.scp.split(' ').includes(scope))return false;
   return Object.freeze({tenantId:p.tid,subject:p.oid,clientId:p.azp,scopes:p.scp.split(' ')});
  }catch{return false;}
 };
}
export function authorizationFromEnv(env=process.env){
 const mode=env.MCP_AUTH_MODE||'none';
 if(mode==='none')return undefined;
 if(mode!=='entra')throw Error('MCP_AUTH_MODE must be none or entra');
 return createEntraAuthorizer({tenantId:env.ENTRA_TENANT_ID,audience:env.ENTRA_API_CLIENT_ID,scope:env.ENTRA_REQUIRED_SCOPE,clientIds:(env.ENTRA_ALLOWED_CLIENT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)});
}
