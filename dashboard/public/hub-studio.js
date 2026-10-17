import {resources} from './resource-catalogue.js';
import {createResourceLibrary} from './resource-library.js';
export function createStudio(c){
const {esc,link,pageHead}=c;
const state=()=>c.state();
function overview(){
const url=id=>(resources.find(r=>r.id===id)?.endpoint)||'https://mcp.example.org/'+id;
const list=items=>'<ul class="overview-list">'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
const card=(title,body)=>'<article class="card"><h3>'+title+'</h3>'+body+'</article>';
const example=(id,q)=>'<div class="resource-code prompt-example">'+esc(url(id))+'<br>'+esc(q)+'</div>';
return pageHead('Welcome to the MCP Hub.','Find ready-made AI helpers (MCPs) and use them in the AI assistant you already use. No coding and no setup needed.',link('Open the resource library →','library','','btn lime'),'WETLAND / HUB OVERVIEW')+
'<section class="hero"><div class="hero-copy"><p class="eyebrow">IN ONE MINUTE</p><h2>Find it. Paste it.<br/>Check it.</h2><p>Use any MCP in the library in five short steps. You are always the one who decides.</p></div><div class="hero-map"><div class="flow-art">'+[['Find','the MCP that matches your task in the Resource library.'],['Copy','its MCP URL with the Copy button.'],['Paste','the URL into your AI assistant’s chat, with your question.'],['Read','the answer.'],['Check','it before you use it.']].map(([t,d],i)=>'<div class="flow-node"><span class="num">0'+(i+1)+'</span><div>'+t+'<small>'+d+'</small></div></div>').join('')+'</div></div></section>'+
'<div class="section-title"><h2>What is an MCP?</h2></div><div class="grid two">'+
card('A safe helper for your assistant','<p>Your AI assistant is clever, but on its own it knows nothing about Water Care: our proposals, campaign results, brand or rules.</p><p>An <strong>MCP</strong> (Model Context Protocol) is a helper that gives your assistant safe access to one specific thing, such as our past grant proposals or our fundraising totals.</p>')+
card('Think of it like a plug adapter',list(['Your <strong>assistant</strong> is the device, for example Microsoft Copilot or Claude.','The <strong>MCP</strong> is the adapter that lets it reach one Water Care resource.','The <strong>rules</strong> are built into the adapter. The assistant only gets what the MCP allows.'])+'<p><strong>The MCP decides what data leaves our systems, not the assistant.</strong> That is how we keep donor data protected.</p>')+
'</div><div class="section-title"><h2>Using an MCP, step by step</h2></div><div class="grid two">'+
card('1. Choose the right MCP','<p>Open the '+link('Resource library','library','','text-link')+'. Search by task, for example “brand”, “growth” or “grant”, and open a card to see what the MCP does.</p>')+
card('2. Copy the MCP URL','<p>In the MCP’s details, click <strong>Copy</strong> next to the MCP URL. It looks like this:</p><div class="resource-code">'+esc(url('grant-applications'))+'</div>')+
card('3. Paste the URL and your question','<p>Start a new chat in your AI assistant. Paste the MCP URL, then ask your question in plain language, the way you would ask a colleague.</p>'+example('grant-applications','Draft a 200-word problem statement for a funder application, based on our approved programme facts.')+'<p></p>'+example('branding','What colours and fonts should I use for a World Water Day flyer?')+'<p>Using the MCP URL every time keeps answers consistent: everyone works from the same data, templates and rules.</p>')+
card('4. Check before you use it','<p>AI can make mistakes. Before anything leaves your desk:</p>'+list(['<strong>Check facts and numbers</strong>, especially anything for a funder, the board or the public.','<strong>Use the sources.</strong> Most MCPs show where their answer came from.','<strong>Funder reports and proposals:</strong> note that you used AI. Some funders require us to disclose it. You are responsible for the final text.']))+
'</div><div class="notice blue"><strong>Tips:</strong> use one MCP per chat and start a new chat for a different task. Say what format you want back: a table, a short paragraph, bullet points, English and French. If the answer isn’t quite right, just reply with what to change (“shorter”, “more formal”).</div>'+
'<div class="section-title"><h2>Keeping data safe</h2></div><div class="grid two">'+
card('What MCPs will never share',list(['Major-donor and legacy relationship notes','Bereavement and legacy conversations','HR files and staff records','Safeguarding reports','Personal data about people in the communities we work with'])+'<p>MCPs that use supporter data only give <strong>totals and trends</strong>, never names, emails or addresses. If an MCP says no, that is the system working as intended, not an error.</p>')+
card('Rules to remember',list(['✅ <strong>Check</strong> every output before you use it. A named person is accountable for anything we send.','✅ <strong>Disclose</strong> material AI use in funder proposals and reports.','❌ Do <strong>not</strong> paste donor, staff or partner personal information into personal AI accounts or unapproved tools.','❌ Do <strong>not</strong> use AI to make decisions about people.','❌ Do <strong>not</strong> create images that look like real photos of communities.']))+
'</div>'+
'<div class="section-title"><h2>Frequently asked questions</h2></div><div class="grid two">'+[
['Is AI going to replace my job?','No. Success is measured by time given back for the work that matters, such as supporter conversations, partner support and better proposals, not by cutting roles.'],
['Which assistant should I use?','The AI assistant Water Care has approved for work, signed in with your Water Care account. Not a personal AI account. Ask IT &amp; Operations if you’re unsure.'],
['The MCP refused my request. Is it broken?','Probably not. It may be protecting personal data. Its message usually tells you what it can provide instead, for example a count rather than a list of names.'],
['The answer looks wrong. What do I do?','Don’t use it. Check the source and tell the MCP’s owner.'],
['Does the AI learn from our data?','Our work assistant is set up so the vendor does not train on our data. MCPs that use supporter data only send totals, never names.'],
['Can I use it in French?','Yes. Ask in French, or ask for both languages. French text for supporters should still be reviewed by the Bilingual Content Coordinator.']
].map(([q,a])=>card(q,'<p>'+a+'</p>')).join('')+'</div>'+
'<div class="section-title"><h2>Words you might see</h2></div><div class="card"><table class="evidence-table"><thead><tr><th>Word</th><th>Plain meaning</th></tr></thead><tbody>'+[
['Assistant / model','The AI chat tool you type into, for example Copilot or Claude.'],
['MCP','A ready-made helper that gives your assistant safe access to one Water Care resource.'],
['MCP URL','The web address you paste into the chat to use an MCP.'],
['Prompt','What you type to the assistant.'],
['Aggregated','Totals or averages, with no individual people shown.']
].map(([w,m])=>'<tr><td><strong>'+w+'</strong></td><td>'+m+'</td></tr>').join('')+'</tbody></table></div>'}

const libraryView=createResourceLibrary(c);
return {render(route){return route==='overview'?overview():route==='library'?libraryView.render():undefined}};
}
