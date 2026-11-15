# Report and input formats

## Text input

Browser text import is UTF-8 plain text or Markdown treated as literal text. CLI input paths can use any extension; their content is read as UTF-8. A lock file has one exact phrase per line.

## JSON report, version 1

The engine returns `version`, `source`, `rewrite`, `locked`, `findings`, `aligned`, and `limitations`. Browser exports additionally include `reviewed`, an array of finding IDs. The CLI engine does not add review decisions.

Each finding includes:

| Field | Meaning |
| --- | --- |
| `id` | Report-local identifier; not stable across edits |
| `kind` | `number`, `date`, `link`, `negation`, `commitment`, `bound`, `condition`, `scope`, `locked`, or `coverage` |
| `severity` | `check` for observable difference; `review` for interpretation, including changed ambiguous numeric notation |
| `title`, `detail` | Human-readable description |
| `source`, `rewrite` | Sentence evidence or protected phrase |
| `sourceSentence`, `rewriteSentence` | Zero-based segmented sentence indices, or `null` |

Alignment entries contain the source/rewrite text and a lexical similarity between 0 and 1. That score is an alignment aid, not a probability of correctness. Consumers should reject unsupported `version` values and preserve the limitations text when showing reports.
