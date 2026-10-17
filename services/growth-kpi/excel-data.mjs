import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadDataset} from './model.mjs';
import {canonicalizeExcelRows,parseExcelDemoCSV,EXCEL_DEMO_CANONICAL_VERSION} from './demo/excel-normalize.js';
export async function getExcelDemoData(){
 const data=await loadDataset();
 if(data.manifest.synthetic!==true||data.manifest.dataset_id!=='synthetic-re-growth-v1')throw Error('Excel demo requires the fixed synthetic fixture');
 const bytes=await readFile(new URL('./data/gifts.csv',import.meta.url));
 const sourceDigest=createHash('sha256').update(bytes).digest('hex');
 if(sourceDigest!==data.manifest.files['gifts.csv'].sha256)throw Error('Synthetic gift export changed during validation');
 const {headers,rows}=parseExcelDemoCSV(bytes.toString('utf8'));
 const receipt=await canonicalizeExcelRows(headers,rows);
 if(receipt.rowCount!==data.manifest.files['gifts.csv'].rows)throw Error('Synthetic gift row count mismatch');
 return {headers,rows,...receipt,canonicalVersion:EXCEL_DEMO_CANONICAL_VERSION,datasetId:data.manifest.dataset_id,synthetic:true,sourceDigest,
  notice:'Fixed synthetic gift export only. Growth is calculated from the server-bundled lifetime gifts, payment receipts/refunds, constituent records and merge history; this worksheet alone is not sufficient to establish first-ever received donations.'};
}
export async function verifyExcelDemoInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'digest')||!Object.hasOwn(input,'rowCount'))throw Error('Send only a digest and rowCount; workbook contents are not accepted');
 if(typeof input.digest!=='string'||!/^[a-f0-9]{64}$/.test(input.digest)||!Number.isSafeInteger(input.rowCount)||input.rowCount<=0||input.rowCount>2000)throw Error('Invalid synthetic workbook receipt');
 const expected=await getExcelDemoData();
 if(input.rowCount!==expected.rowCount||input.digest!==expected.digest)throw Error('Workbook does not match the complete, unmodified synthetic gift export. Download the demo CSV again; real or altered workbooks are not accepted.');
 return {matched:true,synthetic:true,digest:expected.digest,rowCount:expected.rowCount,datasetId:expected.datasetId,canonicalVersion:expected.canonicalVersion,sourceDigest:expected.sourceDigest,
  notice:expected.notice,verificationBoundary:'Digest matching identifies the fixed demo fixture. It is not proof of workbook access, user authorization or real-data ingestion. No workbook cells were sent to this tool.'};
}
