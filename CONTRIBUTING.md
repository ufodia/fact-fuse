# Contributing to Fact Fuse

Thank you for helping make AI-assisted writing easier to review.

## Set up

Use Node.js 24.18 or later, run `npm ci`, then `npm run dev`. Before submitting a change, run `npm run check`. Keep dependency versions pinned and commit the lockfile whenever dependencies change.

## Useful contributions

- A small, anonymized pair of sentences that produces a false positive or misses a material change.
- A test showing an alignment, numeric normalization, or occurrence-count regression.
- A keyboard, mobile-layout, or documentation fix.

Explain the expected result and why it matters. Changes to language heuristics need both a failing example and a meaning-preserving control. Do not present a new rule as a general semantic guarantee.

## Pull requests

Open a focused pull request against `main`. Describe the behavior, include a reproducible example, and state which checks you ran. Update the relevant guide or report-format documentation if public behavior changes. Do not add telemetry, hosted inference, or third-party data transmission without a separate design discussion.

## Sensitive material

Use invented names and values in fixtures. Do not include real client documents, credentials, internal URLs, or personal data. Follow [SECURITY.md](SECURITY.md) for vulnerabilities and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community participation.
