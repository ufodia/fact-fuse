export type FindingKind = 'number' | 'date' | 'link' | 'negation' | 'commitment' | 'bound' | 'condition' | 'scope' | 'caveat' | 'locked' | 'coverage';
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
const similarity = (a: string, b: string, x: Set<string>, y: Set<string>) => {
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
  // Compare decimal strings exactly: JavaScript Number rounds integers beyond
  // 2^53 and long fractions, which can silently erase a material difference.
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!match) return raw;
  const integer = match[2].replace(/^0+(?=\d)/, '');
  const fraction = (match[3] || '').replace(/0+$/, '');
  const negative = match[1] === '-' && (integer !== '0' || fraction !== '');
  return `${negative ? '-' : ''}${integer}${fraction ? '.' + fraction : ''}`;
}
interface Value {key: string; raw: string; literal?: string; ambiguous?: boolean; start?: number}
const smallNumbers:Record<string,number>={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const ones='one|two|three|four|five|six|seven|eight|nine';
const under100=`(?:zero|${ones}|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\\s]+(?:${ones}))?)`;
const under1000=`(?:(?:${ones})\\s+hundred(?:\\s+(?:and\\s+)?${under100})?|${under100})`;
const wordNumberPattern=new RegExp(`(?<![\\p{L}\\p{N}])(?:(?:minus|negative)\\s+)?(?:a\\s+dozen|${under1000}(?:\\s+million(?:\\s+(?:and\\s+)?${under1000})?)?(?:\\s+thousand(?:\\s+(?:and\\s+)?${under1000})?)?)(?![\\p{L}\\p{N}])(?:[ \\t\\u00a0\\u202f-]*(%|(?:percent|per[ \\t\\u00a0\\u202f]+cent)\\b(?![ \\t\\u00a0\\u202f-]+points?\\b)|USD\\b|EUR\\b|GBP\\b|TRY\\b|kg\\b|mg\\b|km\\b|cm\\b|mm\\b|tonnes?\\b|tons?\\b|points?\\b|upvotes?\\b|hours?\\b|business[ \\t\\u00a0\\u202f]+days?\\b|days?\\b|weeks?\\b|months?\\b|years?\\b|items?\\b|units?\\b))?(?!-[\\p{L}])`,'giu');
function numberWordsValue(text:string):number{
  const signed=/^(?:minus|negative)\s+/i.test(text);
  text=text.replace(/^(?:minus|negative)\s+/i,'');
  if(/^a\s+dozen$/i.test(text))return signed?-12:12;
  let total=0,current=0;
  for(const token of text.toLowerCase().split(/[\s-]+/)){
    if(token==='and')continue;
    if(token==='hundred')current*=100;
    else if(token==='thousand'||token==='million'){total+=current*(token==='million'?1_000_000:1_000);current=0;}
    else current+=smallNumbers[token]??0;
  }
  return signed?-(total+current):total+current;
}
function values(s: string, kind: 'number'|'date'|'link'): Value[] {
  if (kind === 'link') return [...s.matchAll(/https?:\/\/[^\s<>"']+/g)].map(m => ({key:m[0].replace(/[.,;)!?]+$/, ''),raw:m[0].replace(/[.,;)!?]+$/, '')}));
  const datePattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/]\d{1,2}[\/]\d{4})\b/g;
  if (kind === 'date') return [...s.matchAll(datePattern)].map(m => ({key:m[0],raw:m[0]}));
  const clean = s.replace(/https?:\/\/[^\s<>"']+/g, m => ' '.repeat(m.length)).replace(datePattern, m => ' '.repeat(m.length));
  const numeric=[...clean.matchAll(/([$€£₺]|\b(?:USD|EUR|GBP|TRY))?\s*([+-]?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*))(?:[ \t\u00a0\u202f-]*(%|(?:percent|per[ \t\u00a0\u202f]+cent)\b(?![ \t\u00a0\u202f-]+points?\b)|USD\b|EUR\b|GBP\b|TRY\b|kg\b|mg\b|km\b|cm\b|mm\b|tonnes?\b|tons?\b|points?\b|upvotes?\b|hours?\b|business[ \t\u00a0\u202f]+days?\b|days?\b|weeks?\b|months?\b|years?\b|items?\b|units?\b))?/gi)].map(m => {
    const percent = /^(?:%|percent|per[ \t\u00a0\u202f]+cent)$/i.test(m[3] || '');
    const prefix = ({'$':'USD','€':'EUR','£':'GBP','₺':'TRY'} as Record<string,string>)[m[1] || ''] || (m[1] || '').toUpperCase();
    const unit = percent ? `${prefix ? prefix + ':' : ''}%` : (prefix || (m[3] || '').toUpperCase().replace(/S$/, ''));
    return {key:`${normalizeNumber(m[2])}:${unit}`,raw:m[0].trim(),literal:m[2],ambiguous:/^[+-]?\d{1,3}[.,]\d{3}$/.test(m[2]),start:m.index ?? 0};
  });
  const spelled=[...clean.matchAll(wordNumberPattern)].map(m=>{
    const unit=(m[1]||'').toUpperCase().replace(/S$/,'').replace(/^PERCENT$|^PER\s+CENT$/,'%');
    const text=m[1]?m[0].slice(0,m[0].length-m[1].length).trim():m[0];
    return {key:`${numberWordsValue(text)}:${unit}`,raw:m[0].trim(),literal:text,start:m.index ?? 0};
  });
  return [...numeric,...spelled];
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
const ignoredLabels = new Set(['a','an','and','after','all','also','any','as','at','before','but','by','each','every','for','from','if','in','it','our','so','that','the','then','these','they','this','those','we','when','with','your']);
const labelTokens = (s: string) => [...s.matchAll(/\b[\p{Lu}][\p{L}\p{N}_-]+\b/gu)].map(m => ({key:m[0].toLocaleLowerCase('en'),label:m[0],start:m.index ?? 0})).filter(m => !ignoredLabels.has(m.key));
function changedQuantityAssignments(source: string, rewrite: string): string[] {
  const sourceLabels = labelTokens(source), rewriteLabels = labelTokens(rewrite);
  const rewriteKeys = new Set(rewriteLabels.map(m => m.key));
  const common = new Map(sourceLabels.filter(m => rewriteKeys.has(m.key)).map(m => [m.key,m.label]));
  if (common.size < 2) return [];
  const assignments = (s: string, labels: Set<string>) => {
    const matches = [...s.matchAll(/;|\s+\b(?:and|or)\b\s+/gi)];
    const separators = matches.filter(m => {
      if (m[0] === ';') return true;
      const index = m.index ?? 0;
      const previous = s.slice(0,index).trimEnd().split(/\s+/).pop()?.toLowerCase() || '';
      const next = s.slice(index + m[0].length).trimStart().split(/\s+/)[0]?.toLowerCase() || '';
      const numberWord = (word: string) => Object.hasOwn(smallNumbers,word) || ['hundred','thousand','million','dozen'].includes(word);
      return !numberWord(previous) && !numberWord(next);
    });
    const ranges: [number,number][] = [];
    let start = 0;
    for (const separator of separators) {
      const index = separator.index ?? 0;
      ranges.push([start,index]);
      start = index + separator[0].length;
    }
    ranges.push([start,s.length]);
    const quantities = values(s,'number');
    const tokens = labelTokens(s);
    const found = new Map<string,Value[]>();
    for (const [from,to] of ranges) {
      const localLabels = tokens.filter(m => m.start >= from && m.start < to && labels.has(m.key));
      const localQuantities = quantities.filter(v => v.start !== undefined && v.start >= from && v.start < to);
      if (localLabels.length !== 1 || localQuantities.length !== 1) continue;
      const bucket = found.get(localLabels[0].key) || [];
      bucket.push(localQuantities[0]);
      found.set(localLabels[0].key,bucket);
    }
    return found;
  };
  const before = assignments(source,new Set(common.keys()));
  const after = assignments(rewrite,new Set(common.keys()));
  const changed = [...common].filter(([key]) => before.get(key)?.length === 1 && after.get(key)?.length === 1 && before.get(key)![0].key !== after.get(key)![0].key);
  if (changed.length < 2) return [];
  return changed.map(([key,label]) => `${label}: “${before.get(key)![0].raw}” → “${after.get(key)![0].raw}”`);
}
// Explicit markers are a review prompt, not a claim that a condition or scope
// was actually removed: paraphrases can preserve meaning with different words.
const markers = (s: string, pattern: RegExp) => [...s.matchAll(pattern)].map(m => ({key:m[0].toLowerCase().replace(/\s+/g,' '),raw:m[0]}));
const conditionMarkers = (s: string) => markers(s, /\b(?:provided\s+that|subject\s+to|on\s+condition\s+that|unless|if)\b/gi);
const caveatMarkers = (s: string) => [...s.matchAll(/\b(?:individual\s+)?(?:results?|outcomes?)\s+(?:(?:may|can)\s+)?vary\b/gi)].map(m => ({
  key: /outcomes?/i.test(m[0]) ? 'outcome-vary' : 'result-vary',
  raw: m[0],
}));
const scopeMarkers = (s: string) => [
  ...markers(s, /\b(?:within|all|every|each|only)\b/gi),
  ...[...s.matchAll(/\bby\s+(?:the\s+)?(?:end|start|beginning)\s+of\b/gi)].map(m => ({
    key: m[0].toLowerCase().replace(/\bthe\s+/i, '').replace(/\s+/g, ' '),
    raw: m[0],
  })),
];

/** Maximum-weight one-to-one alignment; sentences may move. Low-overlap pairs stay unmatched. */
function align(a: string[], b: string[]): [number|null,number|null,number][] {
  const aWords=a.map(words),bWords=b.map(words);
  const weights=a.map((s,i)=>b.map((t,j)=>similarity(s,t,aWords[i],bWords[j])));
  const signatures=(items:string[])=>items.map(s=>values(s,'number').map(v=>v.key).sort().join('|'));
  const aNumbers=signatures(a),bNumbers=signatures(b);
  const canonical=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g,' ').trim();
  const aText=a.map(canonical),bText=b.map(canonical);
  // Hungarian assignment with one zero-weight dummy column per source, so
  // unmatched sentences remain possible without making the pairing monotonic.
  const n=a.length,m=b.length+n,u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
  for(let i=1;i<=n;i++){
    p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
    do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
      for(let j=1;j<=m;j++)if(!used[j]){const ai=i0-1,bi=j-1;const sim=j<=b.length?weights[ai][bi]:0;const w=sim>=.18?sim+(aText[ai]===bText[bi] ? .01 : 0)+(aNumbers[ai]&&aNumbers[ai]===bNumbers[bi] ? .001 : 0):0;const cur=-w-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
      for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
      j0=j1;
    }while(p[j0]!==0);
    do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0!==0);
  }
  const assignment=Array(n).fill(-1),matched=new Set<number>();
  for(let j=1;j<=b.length;j++)if(p[j]&&weights[p[j]-1][j-1]>=.18){assignment[p[j]-1]=j-1;matched.add(j-1);}
  const pairs:[number|null,number|null,number][]=assignment.map((j,i)=>j<0?[i,null,0]:[i,j,weights[i][j]]);
  for(let j=0;j<b.length;j++)if(!matched.has(j))pairs.push([null,j,0]);
  return pairs;
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
        const moved = changedQuantityAssignments(s,r);
        if(moved.length)add('number','review','Quantity association may have changed',`In short clauses with one shared capitalized label and one quantity, the label/value pairing differs: ${moved.join('; ')}. Check whether each quantity still belongs to the same item or plan.`,s,r,ai,bi);
      }
    }
    if(ai!==null&&bi!==null){
      if(negative(s)!==negative(r))add('negation','review','Negation needs a second look','The count of explicit negative words changed. Equivalent expressions may produce a false alarm.',s,r,ai,bi);
      if(modality(s)!==modality(r))add('commitment','review','Commitment strength may have shifted',`Source: ${modality(s)}. Rewrite: ${modality(r)}. Check whether possibility became a promise, or a requirement became optional.`,s,r,ai,bi);
      if(bounds(s)!==bounds(r))add('bound','review','A limit or threshold may have changed',`Source bound: ${bounds(s)}. Rewrite bound: ${bounds(r)}.`,s,r,ai,bi);
      const missingConditions=difference(conditionMarkers(s),conditionMarkers(r));
      if(missingConditions.length)add('condition','review','A condition marker is missing',`Source-only marker(s): ${missingConditions.map(v=>`“${v.raw}”`).join(', ')}. Review the full sentences: the condition may have been dropped or expressed differently.`,s,r,ai,bi);
      const sourceOnlyCaveats=difference(caveatMarkers(s),caveatMarkers(r)),rewriteOnlyCaveats=difference(caveatMarkers(r),caveatMarkers(s));
      if(sourceOnlyCaveats.length||rewriteOnlyCaveats.length)add('caveat','review','A results caveat changed',`Source only: ${sourceOnlyCaveats.map(v=>`“${v.raw}”`).join(', ')||'none.'} Rewrite only: ${rewriteOnlyCaveats.map(v=>`“${v.raw}”`).join(', ')||'none.'} Review whether the caveat changes the strength or limits of the claim.`,s,r,ai,bi);
      const missingScope=difference(scopeMarkers(s),scopeMarkers(r));
      if(missingScope.length)add('scope','review','A scope or timing marker is missing',`Source-only marker(s): ${missingScope.map(v=>`“${v.raw}”`).join(', ')}. Review the full sentences: scope or timing may have changed, or the wording may be equivalent.`,s,r,ai,bi);
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
