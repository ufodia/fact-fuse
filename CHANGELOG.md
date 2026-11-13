# Changelog

## Unreleased

- Prevented unfinished text imports from overwriting newer edits, files or samples.
- Cached sentence tokens during alignment to keep comparisons near the input limits responsive.
- Added browser regression coverage for superseded imports.

## 0.1.0 — 2026-11-13

- Added local source/rewrite comparison and monotonic sentence alignment.
- Added quantity, date, link, protected-wording, negation, commitment, and threshold checks.
- Added occurrence-aware comparisons, locale numeric normalization, review states, JSON export, and text import.
- Added a shared CLI engine, runnable examples, unit coverage, and a responsive workbench.

This is an initial public development version. Semantic-equivalence certification and model inference are outside its scope.
