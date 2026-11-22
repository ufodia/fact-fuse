import { describe,it,expect } from 'vitest';
import { analyze,normalizeNumber } from '../src/core';
describe('Fact Fuse',()=>{
  it('normalizes locale equivalent quantities',()=>{expect(normalizeNumber('1.234,50')).toBe('1234.5');expect(normalizeNumber('1,234.50')).toBe('1234.5');expect(analyze('The total price is 1.234,50 EUR.','The total price is 1,234.50 EUR.').findings).toHaveLength(0);});
  it('catches changed quantities and added quantities',()=>{const r=analyze('Delivery takes 14 days.','Delivery takes 30 days.');expect(r.findings.some(f=>f.kind==='number'&&f.detail.includes('14 days')&&f.detail.includes('30 days'))).toBe(true);});
  it('finds changed written English quantities and keeps equivalent forms clean',()=>{
    for(const [a,b] of [['Reply within thirty days.','Reply within sixty days.'],['We support ten users.','We support twenty users.'],['The limit is one hundred and twenty items.','The limit is one hundred and twenty-one items.'],['The contract has a thirty-day deadline.','The contract has a sixty-day deadline.']])expect(analyze(a,b).findings.some(f=>f.kind==='number')).toBe(true);
    for(const [a,b] of [['Reply within thirty days.','Reply within 30 days.'],['There are a dozen items.','There are 12 items.'],['There are one hundred and twenty items.','There are 120 items.'],['The budget is one million two hundred thousand units.','The budget is 1200000 units.'],['The contract has a thirty-day deadline.','The contract has a 30-day deadline.']])expect(analyze(a,b).findings.filter(f=>f.kind==='number')).toHaveLength(0);
  });
  it('preserves negative signs on written quantities',()=>{
    for(const [a,b] of [['The temperature is minus five degrees.','The temperature is five degrees.'],['The balance is negative twenty dollars.','The balance is twenty dollars.'],['The total is negative one hundred items.','The total is one hundred items.']])expect(analyze(a,b).findings.some(f=>f.kind==='number')).toBe(true);
    for(const [a,b] of [['The temperature is minus five degrees.','The temperature is -5 degrees.'],['The balance is negative twenty dollars.','The balance is -20 dollars.'],['The total is negative zero.','The total is 0.']])expect(analyze(a,b).findings.filter(f=>f.kind==='number')).toHaveLength(0);
  });
  it('matches reordered sentences one-to-one without false coverage warnings',()=>{
    const a='The shipment contains 10 chairs. The guide is ready tomorrow.';
    const b='The guide is ready tomorrow. The shipment contains 10 chairs.';
    expect(analyze(a,b).findings).toHaveLength(0);
    const changed=analyze(a,'The guide is ready tomorrow. The shipment contains 20 chairs.');
    expect(changed.findings.filter(f=>f.kind==='number')).toHaveLength(1);
    expect(changed.findings.filter(f=>f.kind==='coverage')).toHaveLength(0);
    const repeated='Section 1 confirms a result. Section 2 confirms a result. Section 3 confirms a result.';
    const shuffled='Section 3 confirms a result. Section 1 confirms a result. Section 2 confirms a result.';
    expect(analyze(repeated,shuffled).findings).toHaveLength(0);
  });
  it('detects a changed currency prefix',()=>expect(analyze('The price is EUR 20.','The price is USD 20.').findings.some(f=>f.kind==='number')).toBe(true));
  it('requires review when ambiguous dotted notation becomes an integer',()=>{const r=analyze('The distance is 1.234 km.','The distance is 1234 km.');expect(r.findings).toHaveLength(1);expect(r.findings[0]).toMatchObject({kind:'number',severity:'review',title:'Ambiguous number format'});expect(r.findings[0].detail).toContain('locale is unspecified');});
  it('does not treat swapped ambiguous separators as proven equivalence',()=>{const r=analyze('The distance is 1,234 km.','The distance is 1.234 km.');expect(r.findings.some(f=>f.kind==='number'&&f.severity==='review')).toBe(true);});
  it('does not flag an unchanged ambiguous numeric literal',()=>expect(analyze('The distance is 1.234 km.','The distance is 1.234 km.').findings).toHaveLength(0));
  it('accepts explicitly disambiguated and space-grouped equivalents',()=>{for(const value of ['1.250,00','1 250','1\u00a0250','1\u202f250'])expect(analyze('The distance is 1,250.00 km.',`The distance is ${value} km.`).findings).toHaveLength(0);});
  it('preserves integer and decimal precision beyond JavaScript Number limits',()=>{
    for(const [source,rewrite] of [
      ['The amount is 9007199254740992 units.','The amount is 9007199254740993 units.'],
      ['The amount is -9007199254740992 units.','The amount is -9007199254740993 units.'],
      ['The amount is 1,000.0000000000000001 units.','The amount is 1000 units.'],
      ['The amount is 0.00000000000000001 units.','The amount is 0 units.'],
    ]) expect(analyze(source,rewrite).findings.some(f=>f.kind==='number'&&f.title==='Quantity changed')).toBe(true);
    for(const [a,b] of [['9007199254740992.00','9007199254740992'],['-00012.3400','-12.34'],['-0.00','0']])expect(normalizeNumber(a)).toBe(normalizeNumber(b));
  });
  it('matches explicit percent forms but keeps different values and unit classes separate',()=>{
    for(const value of ['10 percent','10 per cent','10 PERCENT','10 per\u00a0cent']){
      expect(analyze('The tax rate is 10%.',`The tax rate is ${value}.`).findings.filter(f=>f.kind==='number')).toHaveLength(0);
    }
    for(const value of ['11 percent','10','10 percentage points','10 percent points','10 percent-point','10 percentages','10 percentile','10 cents']){
      expect(analyze('The tax rate is 10%.',`The tax rate is ${value}.`).findings.some(f=>f.kind==='number')).toBe(true);
    }
    expect(analyze('The tax rate is 1,500%.','The tax rate is 1500 percent.').findings.some(f=>f.title==='Ambiguous number format')).toBe(true);
    expect(analyze('The value is USD 10%.','The value is USD 10.').findings.some(f=>f.kind==='number')).toBe(true);
  });
  it('does not merge unrelated numbers across line breaks',()=>expect(analyze('There are 1\n250 chairs.','There are 1250 chairs.').findings.length).toBeGreaterThan(0));
  it('tracks repeated values as a multiset',()=>{expect(analyze('The fee is $50 plus $50.','The fee is $50.').findings.some(f=>f.kind==='number')).toBe(true);});
  it('reviews quantities reassigned between explicit labels',()=>{
    const r=analyze('Basic has 5 seats and Pro has 10 seats.','Basic has 10 seats and Pro has 5 seats.');
    const f=r.findings.find(f=>f.title==='Quantity association may have changed');
    expect(f).toMatchObject({kind:'number',severity:'review'});
    expect(f?.detail).toContain('Basic');
    expect(f?.detail).toContain('Pro');
  });
  it('keeps unchanged label assignments clean when clauses are reordered',()=>{
    expect(analyze('Basic has 5 seats and Pro has 10 seats.','Pro has 10 seats and Basic has 5 seats.').findings).toHaveLength(0);
  });
  it('reviews written quantities without splitting their internal “and”',()=>{
    const r=analyze('Basic has one hundred and twenty seats and Pro has ten seats.','Basic has ten seats and Pro has one hundred and twenty seats.');
    expect(r.findings.find(f=>f.title==='Quantity association may have changed')?.detail).toContain('one hundred and twenty');
  });
  it('does not infer a label/value assignment from clauses with ambiguous quantities',()=>{
    const r=analyze('The Basic and Pro plans have 5 and 10 seats.','The Pro and Basic plans have 10 and 5 seats.');
    expect(r.findings.some(f=>f.title==='Quantity association may have changed')).toBe(false);
  });
  it('does not treat a sentence-initial verb as a quantity label',()=>{
    const r=analyze('Start with 5 cases and Pro has 10 cases.','Start with 10 cases and Pro has 5 cases.');
    expect(r.findings.some(f=>f.title==='Quantity association may have changed')).toBe(false);
  });
  it('does not infer assignments from unsupported half or quarter quantities',()=>{
    const r=analyze('Basic has one and a half seats and Pro has ten seats.','Basic has ten seats and Pro has one and a half seats.');
    expect(r.findings.some(f=>f.title==='Quantity association may have changed')).toBe(false);
  });
  it('flags dropped negation and strengthened commitments',()=>{const r=analyze('We may deliver tomorrow. We do not charge a fee.','We will deliver tomorrow. We charge a fee.');expect(r.findings.map(f=>f.kind)).toContain('commitment');expect(r.findings.map(f=>f.kind)).toContain('negation');});
  it('flags changed results caveats and normalizes common variants',()=>{
    const findings=analyze('This app may help you stick to a budget; results vary.','This app will get your spending under control.').findings;
    const f=findings.find(f=>f.kind==='caveat');
    expect(f).toMatchObject({severity:'review',title:'A results caveat changed'});
    expect(findings.map(f=>f.kind)).toContain('commitment');
    expect(analyze('Individual results may vary.','Results vary.').findings.filter(f=>f.kind==='caveat')).toHaveLength(0);
    expect(analyze('Outcomes can vary.','Outcomes may vary.').findings.filter(f=>f.kind==='caveat')).toHaveLength(0);
  });
  it('does not match unrelated numeric sentences',()=>{const r=analyze('Our shipment contains 10 chairs.','The moon has 10 craters.');expect(r.findings.filter(f=>f.kind==='coverage')).toHaveLength(2);});
  it('detects dates and links independently of numbers',()=>{const r=analyze('Meet on 2026-12-10. See https://example.com/a.','Meet on 2026-12-11. See https://example.com/b.');expect(r.findings.filter(f=>f.kind==='date')).toHaveLength(1);expect(r.findings.filter(f=>f.kind==='link')).toHaveLength(1);expect(r.findings.filter(f=>f.kind==='number')).toHaveLength(0);});
  it('detects changed bounds and a dropped upper limit',()=>{
    expect(analyze('Deliver at most 50 items.','Deliver at least 50 items.').findings.map(f=>f.kind)).toContain('bound');
    expect(analyze('We may deliver up to 500 units.','We may deliver 500 units.').findings.some(f=>f.kind==='bound')).toBe(true);
    expect(analyze('We may deliver up to 500 units.','We may deliver up to 500 units.').findings.filter(f=>f.kind==='bound')).toHaveLength(0);
  });
  it('flags missing explicit conditions and retains both sentences as evidence',()=>{
    for(const marker of ['if the supplier confirms','unless stock runs out','provided that stock arrives','subject to supplier confirmation']){
      const source=`Delivery by Friday ${marker}.`, rewrite='Delivery by Friday.';
      const f=analyze(source,rewrite).findings.find(f=>f.kind==='condition');
      expect(f).toMatchObject({severity:'review',source,rewrite});
      expect(f?.detail).toContain('expressed differently');
      expect(f?.sourceHighlights?.map(span=>source.slice(span.start,span.end))).toEqual([marker]);
    }
  });
  it('highlights the leading condition phrase as an approximate source span',()=>{
    const source='If the supplier confirms, delivery is by Friday.';
    const f=analyze(source,'Delivery is by Friday.').findings.find(f=>f.kind==='condition');
    expect(f?.sourceHighlights?.map(span=>source.slice(span.start,span.end))).toEqual(['If the supplier confirms,']);
    expect(f?.detail).toContain('not a parsed clause');
  });
  it('flags missing scope and timing markers for review',()=>{
    for(const [source,rewrite] of [['All customers receive an update.','Customers receive an update.'],['Reply within 30 days.','Reply in 30 days.'],['Works offline after the first sync.','Works offline.']]){
      const f=analyze(source,rewrite).findings.find(f=>f.kind==='scope');
      expect(f).toMatchObject({severity:'review',source,rewrite});
    }
    expect(analyze('Works offline after the first sync.','Works offline after the first sync.').findings).toHaveLength(0);
  });
  it('reviews a changed event that starts an explicit relative deadline',()=>{
    const source='We’ll ship the replacement within 2 days of receiving the return.';
    const rewrite='We’ll ship the replacement within 2 days of approving the return.';
    const f=analyze(source,rewrite).findings.find(f=>f.title==='A deadline trigger may have changed');
    expect(f).toMatchObject({kind:'scope',severity:'review',source,rewrite});
    expect(f?.detail).toContain('Source trigger only: “receiving the return”');
    expect(f?.detail).toContain('Rewrite trigger only: “approving the return”');
  });
  it('keeps equivalent duration formats clean when the deadline trigger is unchanged',()=>{
    const r=analyze('We’ll ship within two business days of receiving the return.','We’ll ship within 2 business days of receiving the return.');
    expect(r.findings.find(f=>f.title==='A deadline trigger may have changed')).toBeUndefined();
  });
  it('reviews a removed event phrase while the relative deadline remains',()=>{
    const r=analyze('Reply within 2 days of receiving the item.','Reply within 2 days.');
    const f=r.findings.find(f=>f.title==='A deadline trigger may have changed');
    expect(f?.detail).toContain('Source trigger only: “receiving the item”');
    expect(f?.detail).toContain('Rewrite trigger only: none.');
  });
  it('flags a changed relative deadline boundary and normalizes an optional article',()=>{
    const source='The invoice is due by the end of the month.';
    const rewrite='The invoice is due this month.';
    const f=analyze(source,rewrite).findings.find(f=>f.kind==='scope');
    expect(f).toMatchObject({severity:'review',source,rewrite});
    expect(f?.detail).toContain('by the end of');
    expect(analyze('The invoice is due by end of the month.','The invoice is due by the end of the month.').findings.filter(f=>f.kind==='scope')).toHaveLength(0);
  });
  it('does not flag unchanged condition and scope markers',()=>{
    const text='All customers receive an update within 30 days if the supplier confirms.';
    expect(analyze(text,text).findings).toHaveLength(0);
  });
  it('flags changed known units even when the numeric value is unchanged',()=>{
    for(const [source,rewrite] of [['The draft had 80 points.','The draft had 80 upvotes.'],['The shipment is up to 5 tonnes.','The shipment is up to 5 kg.'],['We respond within 5 business days.','We respond within 5 days.'],['We respond within 30 business days.','We respond within 30 days.']]){
      expect(analyze(source,rewrite).findings.some(f=>f.kind==='number')).toBe(true);
    }
  });
  it('flags added or changed scope qualifiers for human review',()=>{
    for(const [source,rewrite,sourceOnly,rewriteOnly] of [
      ['Updates apply to selected plans.','Updates apply to all plans.','selected','all'],
      ['Updates apply to all plans.','Updates apply to selected plans.','all','selected'],
      ['Updates apply to plans.','Updates apply to all plans.','none.','all'],
    ]){
      const f=analyze(source,rewrite).findings.find(f=>f.kind==='scope');
      expect(f).toMatchObject({severity:'review',source,rewrite});
      expect(f?.detail).toContain(sourceOnly==='none.'?'Source only: none.':`Source only: “${sourceOnly}”`);
      expect(f?.detail).toContain(rewriteOnly==='none.'?'Rewrite only: none.':`Rewrite only: “${rewriteOnly}”`);
    }
    expect(analyze('Updates apply to selected plans.','Updates apply to selected plans.').findings.filter(f=>f.kind==='scope')).toHaveLength(0);
  });
  it('checks locked wording and absent locks',()=>{const r=analyze('The price is fixed.','The price remains fixed.',['price is fixed','missing']);expect(r.findings.filter(f=>f.kind==='locked')).toHaveLength(2);});
  it('preserves untrusted input as plain data',()=>{const t='<img src=x onerror=alert(1)> The total is 40.';expect(analyze(t,t).source).toBe(t);expect(analyze(t,t).findings).toHaveLength(0);});
  it('rejects missing and oversized inputs',()=>{expect(()=>analyze('','x')).toThrow();expect(()=>analyze('x'.repeat(120001),'x')).toThrow();});
  it('leaves identical statements unchanged',()=>expect(analyze('There are 20 items and 5% tax.','There are 20 items and 5% tax.').findings).toHaveLength(0));
});
