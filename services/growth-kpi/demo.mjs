import {writeFile} from 'node:fs/promises';
import {buildReport} from './reports.mjs';
const {report,artifact}=await buildReport({start:'2026-07-01',end:'2026-09-30',target:150,comparisonStart:'2026-04-01',comparisonEnd:'2026-06-30'});
await writeFile(new URL('./examples/growth-branded.pdf',import.meta.url),artifact.pdf);
await writeFile(new URL('./examples/growth-branded.html',import.meta.url),artifact.html);
await writeFile(new URL('./examples/growth-branded.json',import.meta.url),JSON.stringify({...report,brand:artifact.evidence},null,2)+'\n');
console.log('Created examples/growth-branded.pdf, .html and .json through the required Brand pipeline.');
