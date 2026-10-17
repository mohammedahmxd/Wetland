import {z} from 'zod';
import {calculateGrowth} from './capability.mjs';
import {renderBrandedReport} from '@wetland/mcp-reporting';
export const reportInput=z.object({start:z.string(),end:z.string(),target:z.coerce.number().int().positive().max(10000000).optional(),comparisonStart:z.string().optional(),comparisonEnd:z.string().optional()}).strict();
export async function buildReport(input,options){const args=reportInput.parse(input),report=await calculateGrowth(args),artifact=await renderBrandedReport(report,options);return {args,report,artifact};}
function links(args,artifactId){
 const base=process.env.PUBLIC_BASE_URL;if(!base)return null;
 const query=new URLSearchParams(Object.entries({...args,artifact:artifactId}).map(([key,value])=>[key,String(value)]));
 return {pdf:new URL('/reports/growth.pdf?'+query,base).href,html:new URL('/reports/growth.html?'+query,base).href};
}
export async function generateReport(input){
 if(!process.env.PUBLIC_BASE_URL)throw Error('PUBLIC_BASE_URL is required to deliver generated reports; use calculate_growth for local figures');
 const {args,report,artifact}=await buildReport(input);
 return {...report,brand:artifact.evidence,artifactId:artifact.artifactId,downloads:links(args,artifact.artifactId),delivery:'Downloads revalidate Brand and report hashes; changed dependencies return 409. Protected deployments require the same user authentication to download.'};
}
export function reportRoutes(authorize,{builder=buildReport}={}){return async(req,res,pathname)=>{
 if(!['/reports/growth.pdf','/reports/growth.html'].includes(pathname))return false;
 if(req.method!=='GET'){res.writeHead(405,{Allow:'GET'});res.end();return true;}
 if(authorize&&!await authorize(req)){res.writeHead(401,{'WWW-Authenticate':'Bearer'});res.end('Unauthorized');return true;}
 res.setHeader('Cache-Control','no-store');
 const query=new URL(req.url,'http://localhost').searchParams,artifactId=query.get('artifact');query.delete('artifact');
 let args;try{if(!/^[a-f0-9]{64}$/.test(artifactId||''))throw Error();args=reportInput.parse(Object.fromEntries(query));}catch{res.writeHead(400);res.end('Invalid report request');return true;}
 try{
  const {artifact}=await builder(args);
  if(artifact.artifactId!==artifactId){res.writeHead(409);res.end('Report or Brand version changed. Generate a new report.');return true;}
  const pdf=pathname.endsWith('.pdf');res.writeHead(200,{'Content-Type':pdf?'application/pdf':'text/html; charset=utf-8','Content-Disposition':`attachment; filename="growth-report-synthetic.${pdf?'pdf':'html'}"`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; sandbox"});res.end(pdf?artifact.pdf:artifact.html);
 }catch{res.writeHead(503);res.end('Brand dependency or report validation unavailable. No document released.');}
 return true;
};}
