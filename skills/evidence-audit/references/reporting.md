# Reporting

## findings.json

One object per candidate, shaped by `schema/findings.schema.json`. Required on every finding: `id` (F-001, in order), `status`, `title`, `class`, `severity`, `summary`.

Required on `confirmed`: `evidence` (file, start_line, end_line, quote), `data_flow` (steps with `file:line`), `attacker`, `fix`, `verified_by`.
Required on `needs_validation`: `to_validate`.
Required on `rejected`: `rejection_reason`, and severity `info`.

## Writing evidence

- Copy the quote from the file. Do not retype from memory and do not paraphrase.
- Keep it short: the line or lines that matter, not the whole function.
- Use several pieces of evidence for a flow (source, sink, missing check).
- Whitespace differences are tolerated. Anything else is not.

## Writing the fix

Say what to change, concretely, in the language of the code. A parameterised query, an allow-list, a different API. Do not write "sanitise input" without saying how.

## Plain wording

Write for the person who has to fix it. State who can trigger it and what they gain. Avoid scare words. Do not pad.

## Run the checks, then build the report

```bash
node scripts/verify-findings.mjs findings.json --root <audited-dir>
node scripts/validate-ledger.mjs coverage-ledger.json --findings findings.json --root <audited-dir>
node scripts/report.mjs findings.json --ledger coverage-ledger.json --out REPORT.md
```

## What to tell the person at the end

The counts by status, the top findings in a sentence each, what was not covered, anything that needs their decision, and that `needs_validation` items are not confirmed vulnerabilities.
