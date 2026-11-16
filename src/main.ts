import './style.css';
import { analyze, type Analysis } from './core';
import { samples } from './samples';

const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
<header class="topbar"><a class="wordmark" href="#"><span class="logo" aria-hidden="true">F<span>•</span></span>fact fuse<span class="edition">BY UFODIA</span></a><nav aria-label="Main navigation"><a href="#workbench">Workbench</a><a href="#method">The method</a><a class="coffee" href="https://buymeacoffee.com/ufodia" target="_blank" rel="noopener noreferrer">☕ Support the project <span>↗</span></a></nav></header>
<main><section class="intro"><div><p class="eyebrow"><span class="signal"></span> A SECOND LOOK, BEFORE YOU HIT SEND</p><h1>Change the words.<br><span>Keep what matters.</span></h1><p class="lede">A polished rewrite can quietly change a price, a limit, or a promise. Put the facts back in focus.</p></div><div class="hero-proof" aria-label="Example factual drift"><span class="proof-label">THE INVISIBLE EDIT</span><p>We <span class="old">may</span> <span class="new">will</span> deliver.</p><div class="proof-note"><span aria-hidden="true">↳</span> A possibility just became a promise.</div><span class="local-pill">↔ Local analysis · No API key</span></div></section>
<section class="workspace" id="workbench" aria-labelledby="workbench-title"><div class="section-head"><div><p class="eyebrow">01 / THE WORKBENCH</p><h2 id="workbench-title">Give your rewrite a second pair of eyes.</h2></div><div class="sample-picker"><label for="sample">Try a case</label><select id="sample"><option value="proposal">The expensive promise</option><option value="clean">Equivalent number formats</option><option value="turkish">Turkish limits & negation</option></select></div></div>
<div class="editors"><div class="editor"><div class="editor-label"><label for="source">Original source</label><span>THE REFERENCE</span></div><textarea id="source" spellcheck="false" maxlength="120000" aria-describedby="source-help"></textarea><div class="editor-foot"><span id="source-help">Keep the version you actually approved.</span><label class="file-label">Import .txt<input id="source-file" type="file" accept=".txt,.md,text/plain,text/markdown"></label></div></div><div class="editor rewrite-editor"><div class="editor-label"><label for="rewrite">AI rewrite</label><span>THE SECOND DRAFT</span></div><textarea id="rewrite" spellcheck="false" maxlength="120000"></textarea><div class="editor-foot"><span>Paste the rewrite exactly as you received it.</span><label class="file-label">Import .txt<input id="rewrite-file" type="file" accept=".txt,.md,text/plain,text/markdown"></label></div></div></div>
<div class="controls"><div class="locks"><label for="locked">Protect exact wording <span>Optional · one phrase per line</span></label><textarea id="locked" rows="2" placeholder="For example: No additional fee applies."></textarea></div><div class="run"><button class="primary" id="compare">Compare drafts <span>↗</span></button><span>On this device. Your words stay yours.</span></div></div><p id="error" role="alert" class="error" hidden></p></section>
<section class="results" aria-labelledby="results-title"><div class="section-head"><div><p class="eyebrow">02 / THE REVIEW</p><h2 id="results-title">Small edits. Real consequences.</h2></div><button class="secondary" id="export" disabled>Export review ↓</button></div><div class="review-layout"><aside class="summary"><span class="summary-label">OPEN FINDINGS</span><strong id="open-count">—</strong><p id="summary-copy">Compare your drafts to begin.</p><div class="legend"><span><i class="check-dot"></i> Observable difference</span><span><i class="review-dot"></i> Language review</span></div><label for="filter">Show findings</label><select id="filter"><option value="all">All findings</option><option value="open">Needs review</option><option value="reviewed">Reviewed</option><option value="number">Quantities</option><option value="condition">Conditions</option><option value="scope">Scope and timing</option><option value="caveat">Results caveats</option><option value="locked">Protected wording</option></select></aside><div id="findings" class="finding-list" aria-live="polite"><div class="empty">Your review will appear here.</div></div></div></section>
<section class="method" id="method"><div><p class="eyebrow">A CHECKPOINT, NOT A VERDICT</p><h2>Know what the<br>check can tell you.</h2></div><div><p>Fact Fuse compares quantities, dates, links, and exact wording. It also surfaces changes in negative words, thresholds, commitment language, common results caveats, and explicit condition or scope markers for you to review.</p><p>Sentence matching is lexical, and language is nuanced. A flag can be harmless; an unflagged rewrite can still change meaning. You make the final call.</p><a href="https://github.com/ufodia/fact-fuse" target="_blank" rel="noopener noreferrer">Read the source & limitations ↗</a></div></section></main>
<footer><span>Fact Fuse <b aria-hidden="true">×</b> Ufodia</span><span>Open source. MIT licensed. Built for a careful second look.</span><a href="https://buymeacoffee.com/ufodia" target="_blank" rel="noopener noreferrer">Buy Ufodia a coffee ↗</a></footer>`;

const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const source=el<HTMLTextAreaElement>('source'),rewrite=el<HTMLTextAreaElement>('rewrite'),locked=el<HTMLTextAreaElement>('locked');
let report:Analysis|null=null;
let reviewed=new Set<string>();
const importVersions:Record<string,number>={source:0,rewrite:0};
const labels:Record<string,string>={number:'QUANTITY',date:'DATE',link:'LINK',negation:'NEGATION',commitment:'COMMITMENT',bound:'THRESHOLD',condition:'CONDITION',scope:'SCOPE',caveat:'RESULTS CAVEAT',locked:'PROTECTED WORDING',coverage:'COVERAGE'};

function render(){
  if(!report)return;
  const active=document.activeElement as HTMLElement|null;
  const focusId=active?.dataset.finding;
  const focusIndex=focusId?[...document.querySelectorAll('.review-button')].indexOf(active!):-1;
  const filter=el<HTMLSelectElement>('filter').value;
  const open=report.findings.length-reviewed.size;
  el('open-count').textContent=String(open);
  el('summary-copy').textContent=open?`${open} item${open===1?'':'s'} to look at before sending.`:report.findings.length?'Every finding has been reviewed.':'No configured differences found. Read the full draft before sending.';
  const container=el('findings');container.replaceChildren();
  const rows=report.findings.filter(f=>filter==='all'||filter==='open'&&!reviewed.has(f.id)||filter==='reviewed'&&reviewed.has(f.id)||f.kind===filter);
  if(!rows.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=report.findings.length?'No findings in this view.':'No configured differences found. This does not establish semantic equivalence.';container.append(empty);}
  for(const f of rows){
    const card=document.createElement('article');card.className=`finding ${f.severity} ${reviewed.has(f.id)?'reviewed':''}`;
    const header=document.createElement('div');header.className='finding-head';
    const type=document.createElement('span');type.className='finding-type';type.textContent=labels[f.kind];
    const status=document.createElement('span');status.className='finding-status';status.textContent=f.severity==='check'?'Observable difference':'Human review';header.append(type,status);
    const title=document.createElement('h3');title.textContent=f.title;
    const description=document.createElement('p');description.textContent=f.detail;
    const pair=document.createElement('div');pair.className='evidence';
    for(const [label,text] of [['SOURCE',f.source],['REWRITE',f.rewrite]]){const block=document.createElement('div');const labelEl=document.createElement('small');labelEl.textContent=label;const quote=document.createElement('p');quote.textContent=text||'No aligned sentence';block.append(labelEl,quote);pair.append(block);}
    const button=document.createElement('button');button.className='review-button';button.dataset.finding=f.id;button.textContent=reviewed.has(f.id)?'✓ Reviewed · reopen':'Mark reviewed';button.setAttribute('aria-pressed',String(reviewed.has(f.id)));button.onclick=()=>{reviewed.has(f.id)?reviewed.delete(f.id):reviewed.add(f.id);render();};
    card.append(header,title,description,pair,button);container.append(card);
  }
  if(focusId&&document.activeElement===document.body){const buttons=[...container.querySelectorAll<HTMLButtonElement>('.review-button')],same=buttons.find(b=>b.dataset.finding===focusId);(same||buttons[Math.min(focusIndex,buttons.length-1)]||el('filter')).focus({preventScroll:!!same});}
}
function compare(){try{report=analyze(source.value,rewrite.value,locked.value.split(/\r?\n/));reviewed=new Set();el('error').hidden=true;el<HTMLButtonElement>('export').disabled=false;render();}catch(e){el('error').textContent=e instanceof Error?e.message:String(e);el('error').hidden=false;}}
function sample(key:keyof typeof samples){importVersions.source++;importVersions.rewrite++;const s=samples[key];source.value=s.source;rewrite.value=s.rewrite;locked.value=s.locked.join('\n');compare();}
function stale(){report=null;reviewed.clear();el<HTMLButtonElement>('export').disabled=true;el('open-count').textContent='—';el('summary-copy').textContent='Drafts changed. Compare again to update the review.';el('findings').replaceChildren();const n=document.createElement('div');n.className='empty';n.textContent='Compare again to review your updated drafts.';el('findings').append(n);}
for(const input of [source,rewrite,locked])input.addEventListener('input',()=>{if(input!==locked)importVersions[input.id]++;stale();});
el('compare').onclick=compare;el('filter').onchange=render;
el<HTMLSelectElement>('sample').onchange=e=>sample((e.target as HTMLSelectElement).value as keyof typeof samples);
for(const field of ['source','rewrite'])el<HTMLInputElement>(`${field}-file`).onchange=async e=>{const input=e.target as HTMLInputElement;const f=input.files?.[0];if(!f)return;const version=++importVersions[field];input.value='';try{if(f.size>500000)throw new Error('Text imports must be 500 KB or smaller.');const text=await f.text();if(version!==importVersions[field])return;el<HTMLTextAreaElement>(field).value=text;stale();el('error').hidden=true;}catch(e){if(version!==importVersions[field])return;el('error').hidden=false;el('error').textContent=e instanceof Error?e.message:String(e);}};
el('export').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify({...report,reviewed:[...reviewed]},null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='fact-fuse-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
sample('proposal');
