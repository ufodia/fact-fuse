# What Fact Fuse can and cannot establish

Fact Fuse is a deterministic, local review aid. It does not determine whether the source itself is true, whether two passages mean the same thing, or whether a proposed commitment is acceptable.

- Sentence alignment uses one-to-one lexical similarity without requiring the original order. Similar or heavily paraphrased sentences can still be paired incorrectly or left unmatched; inspect the evidence.
- Numeric normalization compares digit strings without rounding long integers or decimal fractions. It provisionally treats a lone three-digit group such as `1.234` as a thousands separator. When an equivalent normalized value has a changed literal representation, the report emits an **Ambiguous number format** review finding instead of silently declaring a clean comparison. An unchanged literal does not trigger that finding. The tool cannot infer the author's locale or intended precision: trailing zeroes are ignored when comparing values and may still carry significance in context. Explicit mixed separators such as `1,250.00` / `1.250,00` and space-grouped `1 250` are handled without that ambiguity warning.
- Supported currency markers are USD/EUR/GBP/TRY and `$`, `€`, `£`, `₺`. Supported unit suffixes are defined in `src/core.ts`; the explicit English `percent` and `per cent` forms match `%`, but percentage points are not treated as percentages or reliably recognized as a unit. Removing “percentage points” may therefore go unnoticed. Common English cardinal words through millions and `a dozen` are supported; other languages, ordinals, fractions, exchange rates, and unit conversions are not generally interpreted. In particular, the tool does not equate `30 cents` with `$0.30`.
- ISO and slash-form dates are compared as exact strings. Natural-language dates and date interpretation are not resolved.
- Negation and commitment rules are primarily English. A small set of Turkish words and bounds are included for transparent examples; this is not complete Turkish-language analysis.
- Condition and scope checks flag missing explicit English markers in aligned sentences, including period boundaries such as “by the end of”. Equivalent rewording can raise a false alarm, and rewritten conditions or changes spanning sentences can be missed. These findings require human review.
- Caveat checks recognize only a few explicit English “results may vary” and “outcomes may vary” forms. Other disclaimers and paraphrases can be missed; matching phrases are review prompts, not legal or semantic judgments.
- Negative-word counts can change without a meaning change. `Not required` and `optional` are an example. Counts can also stay the same while the scope of negation changes.
- Protected phrases compare exact occurrences, not paraphrase coverage.
- Case-sensitive URLs are compared after trimming terminal punctuation. URL equivalence, redirect destinations, and availability are not checked.
- Findings can be missed. A report with zero findings is not permission to skip reading the draft.

Use a small, anonymized pair of examples to report an error. Add a meaning-preserving control whenever you propose changing a heuristic.
