#!/usr/bin/env node
// Existing services only. Defaults to printing a reviewable plan; never changes IAM or env.
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const services = ['wetland-ai-workspace','wateraid-brand-hub','wetland-growth-kpi-demo','wetland-examples-mcp'];
export function plan(args) {
 const [action,service,value,...flags]=args;
 if(!['deploy','rollback'].includes(action)||!services.includes(service)||flags.some(x=>x!=='--apply')||flags.length>1)
  throw Error('Usage: node deploy/release.mjs deploy|rollback SERVICE IMAGE_DIGEST|REVISION [--apply]');
 const common=['--project=wateraid-flow','--region=northamerica-northeast2'];
 if(action==='deploy'&&!new RegExp(`^northamerica-northeast2-docker\\.pkg\\.dev/wateraid-flow/web/${service}@sha256:[a-f0-9]{64}$`).test(value||''))
  throw Error('Use the immutable Artifact Registry digest for this service');
 if(action==='rollback'&&(!value?.startsWith(service+'-')||! /^[a-z][a-z0-9-]+$/.test(value)))throw Error('Revision must belong to the selected service');
 return {action,service,value,apply:flags.includes('--apply'),describe:['run','services','describe',service,...common,'--format=json'],
  command:action==='deploy'?['run','services','update',service,...common,`--image=${value}`,'--quiet']:['run','services','update-traffic',service,...common,`--to-revisions=${value}=100`,'--quiet']};
}
export function checkService(state,p) {
 if(state.metadata?.name!==p.service)throw Error('Service identity mismatch');
 const traffic=state.status?.traffic||[];
 // Do not silently replace a canary or unexpectedly deploy with a pinned rollback route.
 if(p.action==='deploy'&&(traffic.length!==1||traffic[0].percent!==100||traffic[0].latestRevision!==true))
  throw Error('Deployment requires one 100% latest-revision route; review and deliberately normalize traffic first');
 return {service:p.service,previousRevision:state.status.latestReadyRevisionName,previousTraffic:traffic,
  runtimeIdentity:state.spec?.template?.spec?.serviceAccountName,command:['gcloud',...p.command]};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const p=plan(process.argv.slice(2));
  const run=args=>execFileSync('gcloud',args,{encoding:'utf8'});
  const state=JSON.parse(run(p.describe));
  if(p.action==='rollback'){
   const revision=JSON.parse(run(['run','revisions','describe',p.value,'--project=wateraid-flow','--region=northamerica-northeast2','--format=json']));
   if(revision.metadata?.labels?.['serving.knative.dev/service']!==p.service||!revision.status?.conditions?.some(c=>c.type==='Ready'&&c.status==='True'))throw Error('Rollback revision must belong to the service and be Ready');
  }
  console.log(JSON.stringify(checkService(state,p),null,2));
  if(p.apply)console.log(run(p.command));else console.log('Plan only. Add --apply to execute this exact image or revision change.');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
