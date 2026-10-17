import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getExcelDemoData,verifyExcelDemoInput} from './excel-data.mjs';
import {canonicalizeExcelRows,parseExcelDemoCSV,EXCEL_DEMO_HEADERS} from './demo/excel-normalize.js';
const fixture=await getExcelDemoData();
const receipt=({digest,rowCount})=>({digest,rowCount});
function asExcelNumbers(rows,dateSystem='1900'){
 const epoch=dateSystem==='1904'?Date.UTC(1904,0,1):Date.UTC(1899,11,30);
 return rows.map(row=>row.map((value,i)=>{
  if(value==='')return '';
  if([0,2,5,10].includes(i))return Number(value);
  if([3,8].includes(i))return (Date.parse(value)-epoch)/86400000;
  return value;
 }));
}
test('Fixed synthetic table verifies without accepting workbook contents',async()=>{
 assert.equal(fixture.rowCount,1083);assert.deepEqual(fixture.headers,EXCEL_DEMO_HEADERS);
 assert.equal((await verifyExcelDemoInput(receipt(fixture))).matched,true);
 await assert.rejects(verifyExcelDemoInput({...receipt(fixture),rows:fixture.rows}),/contents are not accepted/);
 await assert.rejects(verifyExcelDemoInput({digest:fixture.digest,rowCount:'1083'}),/Invalid/);
 assert.ok(fixture.notice.includes('worksheet alone is not sufficient'));
});
test('Excel1900/1904 dates, numeric money/IDs and reordered rows retain full-cell digest',async()=>{
 for(const dateSystem of ['1900','1904']){
  const normalized=await canonicalizeExcelRows(fixture.headers,asExcelNumbers(fixture.rows,dateSystem).reverse(),{dateSystem});
  assert.deepEqual(normalized,receipt(fixture));
 }
 const decimalText=structuredClone(fixture.rows);decimalText[0][5]='150';assert.deepEqual(await canonicalizeExcelRows(fixture.headers,decimalText),receipt(fixture));
 const emptyNulls=fixture.rows.map(row=>row.map(v=>v===''?null:v));assert.deepEqual(await canonicalizeExcelRows(fixture.headers,emptyNulls),receipt(fixture));
});
test('Valid but changed values and missing rows are rejected against the known fixture',async()=>{
 const changed=structuredClone(fixture.rows);changed[0][5]='151.00';
 await assert.rejects(verifyExcelDemoInput(await canonicalizeExcelRows(fixture.headers,changed)),/does not match/);
 await assert.rejects(verifyExcelDemoInput(await canonicalizeExcelRows(fixture.headers,fixture.rows.slice(1))),/does not match/);
 const alteredText=structuredClone(fixture.rows);alteredText[0][9]='Cheque';
 await assert.rejects(verifyExcelDemoInput(await canonicalizeExcelRows(fixture.headers,alteredText)),/does not match/);
});
test('Duplicates, malformed dates, sub-cent values, formulas and arbitrary PII cells fail locally',async()=>{
 await assert.rejects(canonicalizeExcelRows(fixture.headers,[...fixture.rows,fixture.rows[0]]),/duplicate/);
 for(const [index,value] of [[3,60],[3,45000.5],[3,'2026-02-30'],[5,150.001],[5,Infinity],[9,'private.person@example.com'],[5,'=SUM(A1:A2)'],[2,9007199254740992]]){
  const rows=structuredClone(fixture.rows);rows[0][index]=value;await assert.rejects(canonicalizeExcelRows(fixture.headers,rows));
 }
 await assert.rejects(canonicalizeExcelRows([...fixture.headers,'Donor email'],fixture.rows),/headers/);
 await assert.rejects(canonicalizeExcelRows([...fixture.headers].reverse(),fixture.rows),/headers/);
 await assert.rejects(canonicalizeExcelRows(fixture.headers,[fixture.rows[0].slice(1)]),/width/);
});
test('CSV parser preserves quoted cells/BOM/CRLF and rejects malformed records',()=>{
 const parsed=parseExcelDemoCSV('\uFEFFA,B\r\n"a,b","quoted ""word"""\r\n');assert.deepEqual(parsed,{headers:['A','B'],rows:[['a,b','quoted "word"']]});
 for(const text of ['A\n"unclosed','A\n"x"garbage'])assert.throws(()=>parseExcelDemoCSV(text),/CSV/);
});
