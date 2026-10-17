import { z } from 'zod';
export const reportConfiguration = z.object({ includePartialAsFunctional: z.boolean().default(false) }).strict();
export const reportInput = z.object({
  cutoff: z.iso.date(),
  points: z.array(z.string().min(1).max(100)).min(1).max(10000),
  visits: z.array(z.object({ pointId: z.string().min(1).max(100), date: z.iso.date(), status: z.string().min(1).max(80) }).strict()).max(50000)
}).strict();
type Input = z.infer<typeof reportInput>;
type Config = z.infer<typeof reportConfiguration>;
const labels: Record<string,string> = { functional:'functional', 'func.':'functional', 'partially functional':'partial', partially:'partial', 'not functional':'failed', nf:'failed' };
export function report(input: Input, config: Config) {
  const points = new Set(input.points), latest = new Map<string,{date:string,statuses:Set<string>}>();
  let unknownPointVisits = 0;
  for (const visit of input.visits) {
    if (!points.has(visit.pointId)) { unknownPointVisits++; continue; }
    if (visit.date > input.cutoff) continue;
    const status = labels[visit.status.trim().toLowerCase()] ?? 'unknown';
    const previous = latest.get(visit.pointId);
    if (!previous || visit.date > previous.date) latest.set(visit.pointId, {date:visit.date,statuses:new Set([status])});
    else if (visit.date === previous.date) previous.statuses.add(status);
  }
  const counts = {functional:0,partial:0,failed:0,unknown:0,conflict:0,missing:0};
  const needsReview: string[] = [];
  for (const point of points) {
    const item = latest.get(point);
    if (!item) { counts.missing++; needsReview.push(point); }
    else if (item.statuses.size > 1) { counts.conflict++; needsReview.push(point); }
    else { const status = [...item.statuses][0] as keyof typeof counts; counts[status]++; if(status==='unknown') needsReview.push(point); }
  }
  return { cutoff:input.cutoff, denominator:points.size, counts,
    functionalPercent:100*(counts.functional+(config.includePartialAsFunctional?counts.partial:0))/points.size,
    definition:config.includePartialAsFunctional?'Fully or partially functional':'Fully functional only',
    unknownPointVisits, duplicatePointIds:input.points.length-points.size, needsReview,
    state:'draft', implementation:'kijana-report-v1' };
}
export const SUITE = 'kijana-report-safety-v1';
export function evaluate(config: Config) {
  const a = report({cutoff:'2026-06-30',points:['a','b','c'],visits:[{pointId:'a',date:'2026-06-01',status:'Func.'},{pointId:'b',date:'2026-06-01',status:'Partially'},{pointId:'c',date:'2026-07-01',status:'Functional'}]},config);
  const b = report({cutoff:'2026-06-30',points:['a'],visits:[{pointId:'a',date:'2026-06-01',status:'Functional'},{pointId:'a',date:'2026-06-01',status:'NF'},{pointId:'orphan',date:'2026-06-01',status:'Functional'}]},config);
  const results = [
    {name:'Partial functionality is excluded from the fully-functional indicator',passed:Math.abs(a.functionalPercent-100/3)<1e-9},
    {name:'Future visits remain outside the reporting cutoff',passed:a.counts.missing===1},
    {name:'Conflicting latest observations require human review',passed:b.counts.conflict===1&&b.needsReview.includes('a')},
    {name:'Unknown water-point references are flagged',passed:b.unknownPointVisits===1&&b.denominator===1}
  ];
  return {suite:SUITE,passed:results.every(r=>r.passed),results};
}
