import {resources} from './resource-catalogue.js';
import {createResourceLibrary} from './resource-library.js';
export function createStudio(c){
const {esc,link,pageHead}=c;
const state=()=>c.state();
function overview(){
const url=id=>(resources.find(r=>r.id===id)?.endpoint)||'';
const list=items=>'<ul class="overview-list">'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
const card=(title,body)=>'<article class="card"><h3>'+title+'</h3>'+body+'</article>';
const example=(id,q)=>'<div class="resource-code prompt-example">'+esc(url(id))+'<br>'+esc(q)+'</div>';
return pageHead('Welcome to the MCP Hub.','Find ready-made AI helpers (MCPs) and use them in the AI assistant you already use. Try the demos now. Using an MCP in chat requires a compatible assistant with a configured connection.',link('Open the resource library →','library','','btn lime'),'WETLAND / HUB OVERVIEW')+
'<section class="hero"><div class="hero-copy"><p class="eyebrow">IN ONE MINUTE</p><h2>Find it. Connect it.<br/>Check it.</h2><p>Use any MCP in the library in five short steps. You are always the one who decides.</p></div><div class="hero-map"><div class="flow-art">'+[['Find','the MCP that matches your task in the Resource library.'],['Connect','use an approved agent already connected to this MCP, or ask IT to configure it.'],['Ask','your question in that connected agent, or try the demo page.'],['Read','the answer.'],['Check','it before you use it.']].map(([t,d],i)=>'<div class="flow-node"><span class="num">0'+(i+1)+'</span><div>'+t+'<small>'+d+'</small></div></div>').join('')+'</div></div></section>'+
'<div class="notice blue"><strong>Current workspace:</strong> Branding is a public reference kit. Growth and the eight examples use fictional data. Library edits, demo roles and activity are saved in this browser; they do not publish changes to the live MCP services.</div>'+
'<div class="section-title"><h2>What is an MCP?</h2></div><div class="grid two">'+
card('A connection for your assistant','<p>Your AI assistant is clever, but on its own it knows nothing about Water Care: our proposals, campaign results, brand or rules.</p><p>An <strong>MCP</strong> (Model Context Protocol) is a helper that lets a compatible assistant call specific tools and retrieve their results. The current library demonstrates this with public reference material and fictional records.</p>')+
card('Think of it like a plug adapter',list(['Your <strong>assistant</strong> is the device, for example Microsoft Copilot or Claude.','The <strong>MCP</strong> is the adapter that lets it reach one configured service.','The <strong>rules</strong> are built into the adapter. The assistant only gets what the MCP allows.'])+'<p>Access controls must be enforced by each service. Signing in to this workspace does not protect the separate, currently public demo MCP endpoints.</p>')+
'</div><div class="section-title"><h2>Using an MCP, step by step</h2></div><div class="grid two">'+
card('1. Choose the right MCP','<p>Open the '+link('Resource library','library','','text-link')+'. Search by task, for example “brand”, “growth” or “grant”, and open a card to see what the MCP does.</p>')+
card('2. Connect once','<p>Use an approved agent that IT has already connected, or add the MCP URL through your compatible assistant’s connector settings. Pasting a URL into chat does not establish a connection. In the MCP’s details, copy this URL:</p><div class="resource-code">'+esc(url('example-grants'))+'</div>')+
card('3. Ask the connected assistant','<p>Choose the connected agent and ask your question in plain language. For a guided example without assistant setup, open Try demo in the library.</p>'+example('example-grants','Run the grants demonstration workflow and draft a problem statement from its fictional fixture. Identify missing evidence and do not infer eligibility.')+'<p></p>'+example('branding','What colours and fonts should I use for a World Water Day flyer?')+'<p>Ask the assistant to use the connected tools and cite the sources and versions returned. A URL in the prompt alone does not verify that a tool was called.</p>')+
card('4. Check before you use it','<p>AI can make mistakes. Before anything leaves your desk:</p>'+list(['<strong>Check facts and numbers</strong>, especially anything for a funder, the board or the public.','<strong>Use the sources.</strong> Most MCPs show where their answer came from.','<strong>Funder reports and proposals:</strong> note that you used AI. Some funders require us to disclose it. You are responsible for the final text.']))+
'</div><div class="notice blue"><strong>Tips:</strong> use one MCP per chat and start a new chat for a different task. Say what format you want back: a table, a short paragraph, bullet points, English and French. If the answer isn’t quite right, just reply with what to change (“shorter”, “more formal”).</div>'+
'<div class="section-title"><h2>Keeping data safe</h2></div><div class="grid two">'+
card('Keep these records out of the demos',list(['Major-donor and legacy relationship notes','Bereavement and legacy conversations','HR files and staff records','Safeguarding reports','Personal data about people in the communities we work with'])+'<p>These demos do not connect to live supporter records. Before any real-data integration, the team must implement and verify permissions, data minimisation and audit logging for that service.</p>')+
card('Rules to remember',list(['✅ <strong>Check</strong> every output before you use it. A named person is accountable for anything we send.','✅ <strong>Disclose</strong> material AI use in funder proposals and reports.','❌ Do <strong>not</strong> paste donor, staff or partner personal information into personal AI accounts or unapproved tools.','❌ Do <strong>not</strong> use AI to make decisions about people.','❌ Do <strong>not</strong> create images that look like real photos of communities.']))+
'</div>'+
'<div class="section-title"><h2>Frequently asked questions</h2></div><div class="grid two">'+[
['Is AI going to replace my job?','No. Success is measured by time given back for the work that matters, such as supporter conversations, partner support and better proposals, not by cutting roles.'],
['Which assistant should I use?','The AI assistant Water Care has approved for work, signed in with your Water Care account. Not a personal AI account. Ask IT &amp; Operations if you’re unsure.'],
['The MCP refused my request. Is it broken?','Read the error and check the connection and supported inputs. The demos reject unsupported inputs; that alone does not establish production data protection.'],
['The answer looks wrong. What do I do?','Don’t use it. Check the source and tell the MCP’s owner.'],
['Does the AI learn from our data?','Ask IT to confirm the selected assistant’s contract, tenant settings and data retention. This hub cannot verify or configure the vendor’s training policy.'],
['Can I use it in French?','Yes. Ask in French, or ask for both languages. French text for supporters should still be reviewed by the Bilingual Content Coordinator.']
].map(([q,a])=>card(q,'<p>'+a+'</p>')).join('')+'</div>'+
'<div class="section-title"><h2>Words you might see</h2></div><div class="card"><table class="evidence-table"><thead><tr><th>Word</th><th>Plain meaning</th></tr></thead><tbody>'+[
['Assistant / model','The AI chat tool you type into, for example Copilot or Claude.'],
['MCP','A ready-made helper that gives your assistant safe access to one configured service.'],
['MCP URL','The endpoint configured in a compatible assistant’s MCP connection settings.'],
['Prompt','What you type to the assistant.'],
['Aggregated','Totals or averages, with no individual people shown.']
].map(([w,m])=>'<tr><td><strong>'+w+'</strong></td><td>'+m+'</td></tr>').join('')+'</tbody></table></div>'}

const libraryView=createResourceLibrary(c);
return {render(route){return route==='overview'?overview():route==='library'?libraryView.render():undefined}};
}
