export type FindingKind = 'number' | 'date' | 'link' | 'negation' | 'commitment' | 'bound' | 'locked' | 'coverage';
export interface Finding {
  id: string;
  kind: FindingKind;
  severity: 'check' | 'review';
  title: string;
  detail: string;
  source: string;
  rewrite: string;
  sourceSentence: number | null;
  rewriteSentence: number | null;
}
export interface Analysis {
  version: 1;
  source: string;
  rewrite: string;
  locked: string[];
  findings: Finding[];
  aligned: {source: string; rewrite: string; similarity: number}[];
  limitations: string;
}

const words = (s: string) => new Set((s.toLocaleLowerCase('en').match(/[\p{L}]+/gu) || []).filter(w => !['a','an','the','to','of','in','and','we','our','is','it','for'].includes(w)));
const sentences = (s: string) => s.trim().split(/\n+|(?<=[.!?])\s+(?=[\p{Lu}])/u).map(s => s.trim()).filter(Boolean);
const similarity = (a: string, b: string) => {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return a === b ? 1 : 0;
  let common = 0; for (const w of x) if (y.has(w)) common++;
  return common / Math.max(x.size, y.size);
};
export function normalizeNumber(raw: string): string {
  let s = raw.replace(/[\s\u00a0]/g, '');
  const dots = s.includes('.'), commas = s.includes(',');
  if (dots && commas) {
    const decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    s = s.replace(decimal === '.' ? /,/g : /\./g, '').replace(',', '.');
  } else if (commas || dots) {
    if (/^[+-]?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : raw;
}
interface Value {key: string; raw: string; literal?: string; ambiguous?: boolean}
function values(s: string, kind: 'number'|'date'|'link'): Value[] {
  if (kind === 'link') return [...s.matchAll(/https?:\/\/[^\s<>"']+/g)].map(m => ({key:m[0].replace(/[.,;)!?]+$/, ''),raw:m[0].replace(/[.,;)!?]+$/, '')}));
  const datePattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/]\d{1,2}[\/]\d{4})\b/g;
  if (kind === 'date') return [...s.matchAll(datePattern)].map(m => ({key:m[0],raw:m[0]}));
  const clean = s.replace(/https?:\/\/[^\s<>"']+/g, '').replace(datePattern, '');
  return [...clean.matchAll(/([$€£₺]|\b(?:USD|EUR|GBP|TRY))?\s*([+-]?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*))(?:\s*(%|USD|EUR|GBP|TRY|kg|mg|km|cm|mm|hours?|days?|weeks?|months?|years?|items?|units?))?/gi)].map(m => {
    const unit = ({'$':'USD','€':'EUR','£':'GBP','₺':'TRY'} as Record<string,string>)[m[1] || ''] || (m[1] || m[3] || '').toUpperCase().replace(/S$/, '');
    return {key:`${normalizeNumber(m[2])}:${unit}`,raw:m[0].trim(),literal:m[2],ambiguous:/^[+-]?\d{1,3}[.,]\d{3}$/.test(m[2])};
  });
}
function difference(a: Value[], b: Value[]): Value[] {
  const counts = new Map<string,number>(); for (const v of b) counts.set(v.key,(counts.get(v.key)||0)+1);
  return a.filter(v => {const n=counts.get(v.key)||0; if(n){counts.set(v.key,n-1);return false;}return true;});
}
const negative = (s: string) => (s.match(/\b(?:not|never|no|cannot|can't|don't|doesn't|won't|without|neither|prohibited|forbidden|yok|değil|hayır)\b/gi)||[]).length;
const modality = (s: string) => {
  const hard = /\b(?:will|must|shall|guarantee[ds]?|definitely|certainly|required)\b/i.test(s);
  const soft = /\b(?:may|might|could|can|possibly|possible|optional|aim|estimate[ds]?)\b/i.test(s);
  return hard ? 'firm' : soft ? 'qualified' : 'unmarked';
};
const bounds = (s: string) => /\b(?:at least|minimum|no fewer than|en az)\b/i.test(s) ? 'minimum' : /\b(?:at most|maximum|up to|no more than|en fazla)\b/i.test(s) ? 'maximum' : 'unmarked';

/** Conservative, monotonic sentence alignment. Low-overlap pairs are left unmatched. */
function align(a: string[], b: string[]): [number|null,number|null,number][] {
  const scores = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  const moves = Array.from({length:a.length+1},()=>Array<string>(b.length+1).fill(''));
  for(let i=1;i<=a.length;i++){scores[i][0]=-i*.2;moves[i][0]='a';}
  for(let j=1;j<=b.length;j++){scores[0][j]=-j*.2;moves[0][j]='b';}
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    const sim=similarity(a[i-1],b[j-1]);
    const opts:[number,string][]=[[scores[i-1][j]-.2,'a'],[scores[i][j-1]-.2,'b']];
    if(sim>=.18)opts.push([scores[i-1][j-1]+sim,'pair']);
    opts.sort((x,y)=>y[0]-x[0]);[scores[i][j],moves[i][j]]=opts[0];
  }
  const pairs:[number|null,number|null,number][]=[];let i=a.length,j=b.length;
  while(i||j){const m=moves[i][j];if(m==='pair'){pairs.push([--i,--j,similarity(a[i],b[j])]);}else if(m==='a'){pairs.push([--i,null,0]);}else{pairs.push([null,--j,0]);}}
  return pairs.reverse();
}

export function analyze(source: string, rewrite: string, locked: string[] = []): Analysis {
  if (!source.trim() || !rewrite.trim()) throw new Error('Add both the source and the rewrite before comparing.');
  if (source.length > 120000 || rewrite.length > 120000) throw new Error('Each text must contain 120,000 characters or fewer.');
  const a=sentences(source),b=sentences(rewrite);
  if(a.length>400||b.length>400)throw new Error('Use 400 sentences or fewer in each text.');
  const findings:Finding[]=[];const aligned:Analysis['aligned']=[];
  const add=(kind:FindingKind,severity:Finding['severity'],title:string,detail:string,s:string,r:string,ai:number|null,bi:number|null)=>findings.push({id:`f-${findings.length+1}`,kind,severity,title,detail,source:s,rewrite:r,sourceSentence:ai,rewriteSentence:bi});
  for(const [ai,bi,sim] of align(a,b)){
    const s=ai===null?'':a[ai],r=bi===null?'':b[bi];aligned.push({source:s,rewrite:r,similarity:Number(sim.toFixed(3))});
    if(ai===null||bi===null){
      add('coverage','review',ai===null?'Unmatched added sentence':'Unmatched source sentence','Lexical alignment could not pair this sentence. Review for added or omitted meaning; a paraphrase may also trigger this.',s,r,ai,bi);
    }
    for(const kind of ['number','date','link'] as const){
      const av=values(s,kind),bv=values(r,kind),lost=difference(av,bv),added=difference(bv,av);
      if(lost.length||added.length)add(kind,'check',`${kind==='number'?'Quantity':kind==='date'?'Date':'Link'} changed`,`${lost.length?'Source only: '+lost.map(v=>v.raw).join(', '):'No source-only values.'} ${added.length?'Rewrite only: '+added.map(v=>v.raw).join(', '):'No rewrite-only values.'}`,s,r,ai,bi);
      if(kind==='number'&&!lost.length&&!added.length){
        // Equal normalization keys are not enough when a lone separator could be
        // decimal or grouping. Preserve literal identity before declaring a clean pair.
        const literals=(items:Value[])=>items.map(v=>({...v,key:`${v.literal}:${v.key}`}));
        const changed=[...difference(literals(av),literals(bv)),...difference(literals(bv),literals(av))].filter(v=>v.ambiguous);
        if(changed.length)add('number','review','Ambiguous number format',`Review ${[...new Set(changed.map(v=>`“${v.literal}”`))].join(', ')}: a lone dot or comma followed by three digits can be a decimal or a thousands separator. The locale is unspecified, so matching normalized values does not establish equivalence.`,s,r,ai,bi);
      }
    }
    if(ai!==null&&bi!==null){
      if(negative(s)!==negative(r))add('negation','review','Negation needs a second look','The count of explicit negative words changed. Equivalent expressions may produce a false alarm.',s,r,ai,bi);
      if(modality(s)!==modality(r))add('commitment','review','Commitment strength may have shifted',`Source: ${modality(s)}. Rewrite: ${modality(r)}. Check whether possibility became a promise, or a requirement became optional.`,s,r,ai,bi);
      if(bounds(s)!==bounds(r))add('bound','review','A limit or threshold may have changed',`Source bound: ${bounds(s)}. Rewrite bound: ${bounds(r)}.`,s,r,ai,bi);
    }
  }
  const cleanLocked=[...new Set(locked.map(s=>s.trim()).filter(Boolean))].slice(0,50);
  for(const phrase of cleanLocked){
    const needle=phrase.normalize('NFC');
    const count=(s:string)=>s.normalize('NFC').split(needle).length-1;
    const before=count(source),after=count(rewrite);
    if(before===0)add('locked','review','Protected phrase is absent from the source',`“${phrase}” cannot be tracked because it does not occur in your source.`,phrase,'',null,null);
    else if(before!==after)add('locked','check','Protected wording changed',`“${phrase}” occurs ${before} time(s) in the source and ${after} time(s) in the rewrite. Exact wording is case-sensitive.`,phrase,after?'Present with a different occurrence count':'Not found',null,null);
  }
  return {version:1,source,rewrite,locked:cleanLocked,findings,aligned,limitations:'Rule-based review aid. Lexical alignment and language heuristics do not establish semantic equivalence or factual truth. A clear report is not a guarantee.'};
}
