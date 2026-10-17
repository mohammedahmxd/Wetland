import {getExcelDemoData} from './excel-data.mjs';
import {readFile} from 'node:fs/promises';
const files={
 '/excel.html':['demo/excel.html','text/html; charset=utf-8'],
 '/excel.js':['demo/excel.js','text/javascript; charset=utf-8'],
 '/excel.css':['demo/excel.css','text/css; charset=utf-8'],
 '/excel-normalize.js':['demo/excel-normalize.js','text/javascript; charset=utf-8'],
 '/excel-manifest.xml':['excel-manifest.xml','application/xml; charset=utf-8'],
 '/excel-demo.csv':['data/gifts.csv','text/csv; charset=utf-8']
};
export function excelRoutes({enabled=false}={}){return async(req,res,pathname)=>{
 const metadata=pathname==='/excel-demo-data.json';
 const file=files[pathname];if(!file&&!metadata)return false;
 if(!enabled){res.writeHead(404);res.end('Excel demo is not enabled');return true;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return true;}
 if(metadata){const {digest,rowCount}=await getExcelDemoData();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:JSON.stringify({digest,rowCount}));return true;}
 const bytes=await readFile(new URL(file[0],import.meta.url));
 const headers={'Content-Type':file[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(pathname==='/excel-demo.csv')headers['Content-Disposition']='attachment; filename="wetland-synthetic-gifts.csv"';
 if(pathname==='/excel.html')headers['Content-Security-Policy']="default-src 'self'; script-src 'self' https://officeapis.public.onecdn.static.microsoft https://appsforoffice.microsoft.com; connect-src 'self' https://officeapis.public.onecdn.static.microsoft https://appsforoffice.microsoft.com; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://*.office.com https://*.officeapps.live.com https://*.microsoft365.com https://*.sharepoint.com";
 res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:bytes);return true;
};}
