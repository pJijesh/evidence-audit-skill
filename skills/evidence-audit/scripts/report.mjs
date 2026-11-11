#!/usr/bin/env node
// Builds a deterministic REPORT.md from findings.json and, optionally, coverage-ledger.json.
//   node report.mjs findings.json [--ledger coverage-ledger.json] [--out REPORT.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEVERITY_ORDER } from './lib.mjs';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const rank = (f) => SEVERITY_ORDER.indexOf(f.severity);

function evidenceBlock(e) {
  return `\`${e.file}:${e.start_line}${e.end_line !== e.start_line ? `-${e.end_line}` : ''}\`\n\n\`\`\`\n${e.quote.trim()}\n\`\`\``;
}

export function buildReport(doc, ledger) {
  const out = [`# Security audit: ${doc.target}`, ''];
  out.push(`Audited on ${doc.audited_at}${doc.revision ? ` at revision ${doc.revision}` : ''}. Generated from \`findings.json\`; do not edit by hand.`, '');
  const by = (s) => doc.findings.filter((f) => f.status === s);
  const confirmed = by('confirmed').sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const pending = by('needs_validation').sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const rejected = by('rejected');
  out.push('## Summary', '');
  out.push(`${confirmed.length} confirmed, ${pending.length} needing validation, ${rejected.length} rejected.`, '');
  if (confirmed.length) {
    out.push('| ID | Severity | Class | Title |', '| --- | --- | --- | --- |');
    for (const f of confirmed) out.push(`| ${f.id} | ${f.severity} | ${f.class} | ${f.title} |`);
    out.push('');
  }
  if (ledger) {
    const by2 = (s) => ledger.units.filter((u) => u.status === s).length;
    out.push('## Coverage', '', `${ledger.units.length} units: ${by2('hunted')} hunted, ${by2('skipped')} skipped, ${by2('not_started')} not started.`, '');
    const skipped = ledger.units.filter((u) => u.status !== 'hunted');
    for (const u of skipped) out.push(`- ${u.id} \`${u.path}\` (${u.status}): ${u.note || 'no note'}`);
    if (skipped.length) out.push('');
  }
  out.push('## Confirmed findings', '');
  if (!confirmed.length) out.push('None.', '');
  for (const f of confirmed) {
    out.push(`### ${f.id}: ${f.title}`, '', `Severity: ${f.severity}${f.cwe ? `. ${f.cwe}` : ''}. Class: ${f.class}.`, '', f.summary, '');
    out.push(`**Who can trigger it:** ${f.attacker}`, '');
    if (f.impact_detail) out.push(`**Impact:** ${f.impact_detail}`, '');
    out.push('**Evidence**', '');
    for (const e of f.evidence) out.push(evidenceBlock(e), '');
    out.push('**Data flow**', '');
    f.data_flow.forEach((s, i) => out.push(`${i + 1}. ${s}`));
    out.push('', `**Fix:** ${f.fix}`, '', `**Checked by:** ${f.verified_by}`, '');
  }
  out.push('## Needs validation', '', 'These are plausible but were not confirmed from the code alone. Do not treat them as vulnerabilities until tested.', '');
  if (!pending.length) out.push('None.', '');
  for (const f of pending) {
    out.push(`### ${f.id}: ${f.title}`, '', `Suspected severity: ${f.severity}. Class: ${f.class}.`, '', f.summary, '', `**To validate:** ${f.to_validate}`, '');
    for (const e of f.evidence || []) out.push(evidenceBlock(e), '');
  }
  out.push('## Rejected', '', 'Candidates that were investigated and disproved. They are listed so the work is not repeated.', '');
  if (!rejected.length) out.push('None.', '');
  for (const f of rejected) out.push(`- ${f.id} ${f.title}: ${f.rejection_reason}`);
  if (rejected.length) out.push('');
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function main(argv) {
  const args = argv.slice(2);
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--ledger', '--out'].includes(args[i - 1]));
  if (!file || args.includes('--help')) { console.log('usage: report.mjs findings.json [--ledger coverage-ledger.json] [--out REPORT.md]'); return args.includes('--help') ? 0 : 2; }
  let doc, ledger;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); if (val('--ledger')) ledger = JSON.parse(readFileSync(val('--ledger'), 'utf8')); } catch (e) { console.error(`cannot read input: ${e.message}`); return 2; }
  const text = buildReport(doc, ledger);
  if (val('--out')) { writeFileSync(val('--out'), text); console.log(`wrote ${val('--out')}`); } else process.stdout.write(text);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv));
