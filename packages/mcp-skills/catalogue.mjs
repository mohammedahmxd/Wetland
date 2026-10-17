import {lstat,readdir,open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const MAX_BYTES=65536,MAX_FILES=50;
const idPattern=/^[a-z][a-z0-9-]{2,63}$/;
const toolPattern=/^[a-z][a-z0-9_]{1,63}$/;
const versionPattern=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const filePattern=/^[-a-z0-9]{1,50}\.md$/;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function exact(value,keys,label){if(!plain(value)||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!(k in value)))throw Error('Invalid '+label+' fields');}
function text(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max||value.includes('\0'))throw Error('Invalid '+label);return value;}
function rejectDuplicateJsonKeys(json){
 const stack=[];for(const token of json.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]/g)||[]){const top=stack.at(-1);if(token==='{'){stack.push({object:true,keys:new Set(),key:true});}else if(token==='['){stack.push({object:false});}else if(token==='}'||token===']'){stack.pop();}else if(token===','&&top?.object){top.key=true;}else if(token.startsWith('"')&&top?.object&&top.key){const key=JSON.parse(token);if(top.keys.has(key))throw Error('Duplicate metadata key');top.keys.add(key);top.key=false;}}
}
function validateVersion(version){if(typeof version!=='string'||version.length>32||!versionPattern.test(version)||version.split('.').some(n=>!Number.isSafeInteger(Number(n))))throw Error('Invalid skill version');}
export function parseSkill(markdown,{allowedTools,filename='skill.md'}={}){
 if(!filePattern.test(filename)||filename.includes('..'))throw Error('Unsafe skill filename');
 if(typeof markdown!=='string'||Buffer.byteLength(markdown,'utf8')>MAX_BYTES||markdown.includes('\0'))throw Error('Invalid skill file size or content');
 if(!Array.isArray(allowedTools)||allowedTools.some(x=>typeof x!=='string'||!toolPattern.test(x)))throw Error('Explicit allowedTools required');
 const normalized=markdown.replace(/\r\n/g,'\n');const match=/^```json\n([^]*?)\n```\n([^]+)$/.exec(normalized);
 if(!match)throw Error('Skill must begin with one fenced JSON metadata block followed by instructions');
 let m;try{rejectDuplicateJsonKeys(match[1]);m=JSON.parse(match[1]);}catch{throw Error('Invalid skill metadata JSON');}
 exact(m,['schemaVersion','id','version','name','description','status','tools','output','sources'],'skill metadata');
 if(m.schemaVersion!==1||typeof m.id!=='string'||!idPattern.test(m.id))throw Error('Invalid skill identity');validateVersion(m.version);
 text(m.name,160,'skill name');text(m.description,500,'skill description');
 if(!['approved','draft'].includes(m.status))throw Error('Invalid skill status');
 if(!Array.isArray(m.tools)||!m.tools.length||m.tools.length>32||new Set(m.tools).size!==m.tools.length||m.tools.some(x=>!allowedTools.includes(x)))throw Error('Unknown or duplicate skill tool dependency');
 exact(m.output,['kind','description'],'output');text(m.output.kind,80,'output kind');text(m.output.description,500,'output description');
 if(!Array.isArray(m.sources)||!m.sources.length||m.sources.length>32)throw Error('Skill sources required');
 for(const s of m.sources){exact(s,['id','title','uri'],'source');if(!idPattern.test(s.id))throw Error('Invalid source ID');text(s.title,200,'source title');text(s.uri,1000,'source URI');let uri;try{uri=new URL(s.uri);}catch{throw Error('Invalid source URI');}if(!['wetland:','https:'].includes(uri.protocol)||uri.username||uri.password)throw Error('Unsafe source URI');}
 if(new Set(m.sources.map(x=>x.id)).size!==m.sources.length)throw Error('Duplicate source IDs');
 const instructions=text(match[2].trim(),MAX_BYTES,'skill instructions');
 return {...m,digest:createHash('sha256').update(markdown,'utf8').digest('hex'),instructions,markdown:instructions,source:{file:filename,approval:m.status==='approved'?'repository-reviewed':'draft'}};
}
export function validateSkillFiles(files,{allowedTools}={}){
 if(!Array.isArray(files)||files.length>MAX_FILES)throw Error('Too many skill files');const names=new Set(),identities=new Set(),approved=[];
 for(const file of files){exact(file,['filename','markdown'],'skill file');if(names.has(file.filename))throw Error('Duplicate skill filename');names.add(file.filename);const skill=parseSkill(file.markdown,{allowedTools,filename:file.filename}),key=skill.id+'@'+skill.version;if(identities.has(key))throw Error('Duplicate skill ID/version');identities.add(key);if(skill.status==='approved')approved.push(skill);}
 return approved.sort((a,b)=>a.id.localeCompare(b.id)||compareVersions(b.version,a.version));
}
export async function loadSkills(root,{allowedTools}={}){
 const base=root instanceof URL?fileURLToPath(root):resolve(root);const baseStat=await lstat(base);if(!baseStat.isDirectory()||baseStat.isSymbolicLink())throw Error('Unsafe skill package root');
 const folder=join(base,'skills');let stat;try{stat=await lstat(folder);}catch(e){if(e.code==='ENOENT')return validateSkillFiles([],{allowedTools});throw e;}
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Unsafe skills directory');
 const entries=await readdir(folder,{withFileTypes:true});if(entries.length>MAX_FILES)throw Error('Too many skill files');const files=[];
 for(const entry of entries){if(!entry.isFile()||!filePattern.test(entry.name)||entry.name.includes('..'))throw Error('Unsafe entry in skills directory');const filename=join(folder,entry.name);const handle=await open(filename,constants.O_RDONLY|constants.O_NOFOLLOW);try{const info=await handle.stat();if(!info.isFile()||info.size>MAX_BYTES)throw Error('Invalid skill file size');const bytes=Buffer.alloc(MAX_BYTES+1);const{bytesRead}=await handle.read(bytes,0,bytes.length,0);if(bytesRead>MAX_BYTES)throw Error('Invalid skill file size');const decoder=new TextDecoder('utf-8',{fatal:true});files.push({filename:entry.name,markdown:decoder.decode(bytes.subarray(0,bytesRead))});}finally{await handle.close();}}
 return validateSkillFiles(files,{allowedTools});
}
function compareVersions(a,b){const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;}return 0;}
function summary(s){return{id:s.id,version:s.version,name:s.name,description:s.description,digest:s.digest,tools:[...s.tools],output:structuredClone(s.output),sources:structuredClone(s.sources),source:{...s.source}};}
export function findSkills(skills,{query=''}={}){
 if(typeof query!=='string'||query.length>500)throw Error('Invalid skill query');const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return skills.filter(s=>s.status==='approved'&&terms.every(t=>[s.id,s.name,s.description,...s.tools].join(' ').toLowerCase().includes(t))).map(summary);
}
export function getSkill(skills,{id,version}={}){
 if(typeof id!=='string'||!idPattern.test(id))throw Error('Invalid skill ID');if(version!==undefined)validateVersion(version);
 const found=skills.filter(s=>s.status==='approved'&&s.id===id&&(version===undefined||s.version===version)).sort((a,b)=>compareVersions(b.version,a.version))[0];if(!found)throw Error('Approved skill version not found');
 if(!/^[0-9a-f]{64}$/.test(found.digest))throw Error('Invalid skill digest');return structuredClone(found);
}
