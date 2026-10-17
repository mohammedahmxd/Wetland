import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createEntraAuthorizer,authorizationFromEnv} from './entra.mjs';
const tenantId='11111111-1111-4111-8111-111111111111',audience='22222222-2222-4222-8222-222222222222',clientId='33333333-3333-4333-8333-333333333333';
test('Entra verifies signatures, tenant, audience, lifetime, delegated scope and client',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test';
 const allow=createEntraAuthorizer({tenantId,audience,scope:'Reports.Read',clientIds:[clientId],keySet:createLocalJWKSet({keys:[jwk]})});
 const base={ver:'2.0',tid:tenantId,oid:clientId,azp:clientId,scp:'Reports.Read',iss:`https://login.microsoftonline.com/${tenantId}/v2.0`,aud:audience,iat:Math.floor(Date.now()/1000),nbf:Math.floor(Date.now()/1000)-1,exp:Math.floor(Date.now()/1000)+60};
 const sign=(claims,key=privateKey)=>new SignJWT(claims).setProtectedHeader({alg:'RS256',kid:'test'}).sign(key);
 const request=token=>({headers:{authorization:'Bearer '+token}});
 assert.equal((await allow(request(await sign(base)))).subject,clientId);
 for(const change of [{tid:audience},{aud:tenantId},{iss:'https://evil.example'},{exp:1},{nbf:base.exp+100},{scp:'Other.Read'},{azp:tenantId},{idtyp:'app'},{ver:'1.0'},{oid:'bad'},{scp:undefined},{exp:undefined}])assert.equal(await allow(request(await sign({...base,...change}))),false,JSON.stringify(change));
 const other=await generateKeyPair('RS256');assert.equal(await allow(request(await sign(base,other.privateKey))),false);
 assert.equal(await allow({headers:{}}),false);assert.equal(await allow(request('malformed')),false);
});
test('Configuration fails closed',()=>{assert.throws(()=>authorizationFromEnv({MCP_AUTH_MODE:'entra'}));assert.throws(()=>authorizationFromEnv({MCP_AUTH_MODE:'typo'}));assert.equal(authorizationFromEnv({MCP_AUTH_MODE:'none'}),undefined);});
