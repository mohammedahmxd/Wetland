// Explicit release-time refresh: the pane keeps its reviewed style if Brand is unavailable.
import {mkdir,writeFile} from 'node:fs/promises';
import {loadBrand} from '../../../packages/mcp-reporting/brand.mjs';
const brand=await loadBrand();
const dir=new URL('../demo/brand/',import.meta.url);await mkdir(dir,{recursive:true});
for(const [name,bytes] of Object.entries({'wateraid-white-logo.png':brand.png,'noto-sans-regular.ttf':brand.regular,'noto-sans-bold.ttf':brand.bold,'noto-sans-black.ttf':brand.black,'OFL.txt':brand.license}))await writeFile(new URL(name,dir),bytes);
const tokens=brand.guidance.tokens;
await writeFile(new URL('tokens.css',dir),`/* Generated from Brand MCP. Refresh with npm run sync:excel-brand. */\n`+['regular:400','bold:700','black:900'].map(x=>{const [name,weight]=x.split(':');return `@font-face{font-family:Noto;src:url('/brand/noto-sans-${name}.ttf') format('truetype');font-weight:${weight};font-display:swap}`;}).join('\n')+'\n:root{'+Object.entries(tokens.colors).map(([key,c])=>`--${key}:${c.value}`).join(';')+'}\n');
await writeFile(new URL('provenance.json',dir),JSON.stringify({purpose:'Reviewed release-time UI snapshot from Brand MCP; report generation still validates Brand live.',...brand.evidence,tokens},null,2)+'\n');
console.log(JSON.stringify({tokenVersion:tokens.version,snapshotDigest:brand.evidence.snapshotDigest,status:tokens.status}));
