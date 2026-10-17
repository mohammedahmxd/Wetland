import {writeFile} from 'node:fs/promises';
import {loadDataset,growthReport} from './model.mjs';
const report=growthReport(await loadDataset(),{start:'2026-07-01',end:'2026-09-30',target:150,comparisonStart:'2026-04-01',comparisonEnd:'2026-06-30'});
await writeFile(new URL('./examples/growth-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL('./examples/growth-report.md',import.meta.url),report.markdown);
console.log(report.markdown);
