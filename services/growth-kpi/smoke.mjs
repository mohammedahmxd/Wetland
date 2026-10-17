import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const url=new URL(process.argv[2]);
const client=new Client({name:'wetland-deployment-check',version:'1.0.0'});
try{
 await client.connect(new StreamableHTTPClientTransport(url));
 assert.equal((await client.listTools()).tools.length,4);
 const out=await client.callTool({name:'generate_growth_report',arguments:{start:'2026-07-01',end:'2026-09-30',target:150}});
 assert.ok(!out.isError);const value=out.structuredContent||JSON.parse(out.content[0].text);
 assert.equal(value.actual,120);assert.equal(value.attainmentPercent,80);assert.equal(value.gapToTarget,30);assert.ok(value.synthetic);
 console.log(JSON.stringify({endpoint:url.href,actual:value.actual,attainmentPercent:value.attainmentPercent,gap:value.gapToTarget,packageDigest:value.packageDigest}));
}finally{await client.close();}
