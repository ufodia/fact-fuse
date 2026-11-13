# Review a rewrite

## Choose your reference

The source should be the version you approved, not a second AI-generated revision. Paste it into **Original source**. Paste the received rewrite into **AI rewrite**. You can import UTF-8 `.txt` or `.md` files up to 500 KB; the comparison itself accepts up to 120,000 characters and 400 sentences per draft.

Typing in a field, selecting another file for that field, or loading a sample supersedes any unfinished import for the same content. An older file read will not overwrite that newer work.

## Protect exact wording

Put each phrase on its own line. Exact wording is case-sensitive and Unicode-normalized to NFC. A phrase missing from the source produces a review finding. Up to 50 distinct, non-empty phrases are considered. Protected wording is an exact-text check, not a semantic lock inside the AI provider.

## Compare and decide

Select **Compare drafts**. Orange findings show observable token differences; amber findings ask for language review. Read both evidence snippets and the full drafts. Select **Mark reviewed** after deciding whether the change is acceptable. This only records your review; it does not modify either draft.

Use **Show findings** to filter open findings, reviewed findings, quantities, or protected wording. **Export review** downloads the full source, rewrite, alignment, findings, limitations, and reviewed IDs. Store the export with the same care as the original text.

## Make a correction

Edit the rewrite, then compare again. Any input edit invalidates the previous review and disables its export. Review decisions are session-only and are not saved to local storage.

## Troubleshoot

Heavy paraphrases can lose lexical alignment and appear as unmatched sentences. Compare smaller passages or inspect those findings manually. A form such as `1.234` can mean a decimal or grouped thousands. If a rewrite changes that representation while the provisional normalized values match, **Ambiguous number format** asks you to confirm the intended locale and amount. Explicit mixed separators (`1,250.00` / `1.250,00`) and space-grouped thousands are supported. Currency and unit support is deliberately finite; see [limitations](limitations.md).
