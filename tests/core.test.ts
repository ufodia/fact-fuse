import { describe,it,expect } from 'vitest';
import { analyze,normalizeNumber } from '../src/core';
describe('Fact Fuse',()=>{
  it('normalizes locale equivalent quantities',()=>{expect(normalizeNumber('1.234,50')).toBe('1234.5');expect(normalizeNumber('1,234.50')).toBe('1234.5');expect(analyze('The total price is 1.234,50 EUR.','The total price is 1,234.50 EUR.').findings).toHaveLength(0);});
  it('catches changed quantities and added quantities',()=>{const r=analyze('Delivery takes 14 days.','Delivery takes 30 days.');expect(r.findings.some(f=>f.kind==='number'&&f.detail.includes('14 days')&&f.detail.includes('30 days'))).toBe(true);});
  it('detects a changed currency prefix',()=>expect(analyze('The price is EUR 20.','The price is USD 20.').findings.some(f=>f.kind==='number')).toBe(true));
  it('requires review when ambiguous dotted notation becomes an integer',()=>{const r=analyze('The distance is 1.234 km.','The distance is 1234 km.');expect(r.findings).toHaveLength(1);expect(r.findings[0]).toMatchObject({kind:'number',severity:'review',title:'Ambiguous number format'});expect(r.findings[0].detail).toContain('locale is unspecified');});
  it('does not treat swapped ambiguous separators as proven equivalence',()=>{const r=analyze('The distance is 1,234 km.','The distance is 1.234 km.');expect(r.findings.some(f=>f.kind==='number'&&f.severity==='review')).toBe(true);});
  it('does not flag an unchanged ambiguous numeric literal',()=>expect(analyze('The distance is 1.234 km.','The distance is 1.234 km.').findings).toHaveLength(0));
  it('accepts explicitly disambiguated and space-grouped equivalents',()=>{for(const value of ['1.250,00','1 250','1\u00a0250','1\u202f250'])expect(analyze('The distance is 1,250.00 km.',`The distance is ${value} km.`).findings).toHaveLength(0);});
  it('does not merge unrelated numbers across line breaks',()=>expect(analyze('There are 1\n250 chairs.','There are 1250 chairs.').findings.length).toBeGreaterThan(0));
  it('tracks repeated values as a multiset',()=>{expect(analyze('The fee is $50 plus $50.','The fee is $50.').findings.some(f=>f.kind==='number')).toBe(true);});
  it('flags dropped negation and strengthened commitments',()=>{const r=analyze('We may deliver tomorrow. We do not charge a fee.','We will deliver tomorrow. We charge a fee.');expect(r.findings.map(f=>f.kind)).toContain('commitment');expect(r.findings.map(f=>f.kind)).toContain('negation');});
  it('does not match unrelated numeric sentences',()=>{const r=analyze('Our shipment contains 10 chairs.','The moon has 10 craters.');expect(r.findings.filter(f=>f.kind==='coverage')).toHaveLength(2);});
  it('detects dates and links independently of numbers',()=>{const r=analyze('Meet on 2026-12-10. See https://example.com/a.','Meet on 2026-12-11. See https://example.com/b.');expect(r.findings.filter(f=>f.kind==='date')).toHaveLength(1);expect(r.findings.filter(f=>f.kind==='link')).toHaveLength(1);expect(r.findings.filter(f=>f.kind==='number')).toHaveLength(0);});
  it('detects changed bounds',()=>expect(analyze('Deliver at most 50 items.','Deliver at least 50 items.').findings.map(f=>f.kind)).toContain('bound'));
  it('flags missing explicit conditions and retains both sentences as evidence',()=>{
    for(const marker of ['if the supplier confirms','unless stock runs out','provided that stock arrives','subject to supplier confirmation']){
      const source=`Delivery by Friday ${marker}.`, rewrite='Delivery by Friday.';
      const f=analyze(source,rewrite).findings.find(f=>f.kind==='condition');
      expect(f).toMatchObject({severity:'review',source,rewrite});
      expect(f?.detail).toContain('expressed differently');
    }
  });
  it('flags missing scope and timing markers for review',()=>{
    for(const [source,rewrite] of [['All customers receive an update.','Customers receive an update.'],['Reply within 30 days.','Reply in 30 days.']]){
      const f=analyze(source,rewrite).findings.find(f=>f.kind==='scope');
      expect(f).toMatchObject({severity:'review',source,rewrite});
    }
  });
  it('does not flag unchanged condition and scope markers',()=>{
    const text='All customers receive an update within 30 days if the supplier confirms.';
    expect(analyze(text,text).findings).toHaveLength(0);
  });
  it('flags changed known units even when the numeric value is unchanged',()=>{
    for(const [source,rewrite] of [['The draft had 80 points.','The draft had 80 upvotes.'],['The shipment is up to 5 tonnes.','The shipment is up to 5 kg.']]){
      expect(analyze(source,rewrite).findings.some(f=>f.kind==='number')).toBe(true);
    }
  });
  it('checks locked wording and absent locks',()=>{const r=analyze('The price is fixed.','The price remains fixed.',['price is fixed','missing']);expect(r.findings.filter(f=>f.kind==='locked')).toHaveLength(2);});
  it('preserves untrusted input as plain data',()=>{const t='<img src=x onerror=alert(1)> The total is 40.';expect(analyze(t,t).source).toBe(t);expect(analyze(t,t).findings).toHaveLength(0);});
  it('rejects missing and oversized inputs',()=>{expect(()=>analyze('','x')).toThrow();expect(()=>analyze('x'.repeat(120001),'x')).toThrow();});
  it('leaves identical statements unchanged',()=>expect(analyze('There are 20 items and 5% tax.','There are 20 items and 5% tax.').findings).toHaveLength(0));
});
