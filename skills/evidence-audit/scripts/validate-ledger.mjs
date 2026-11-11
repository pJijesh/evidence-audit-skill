#!/usr/bin/env node
// Validates coverage-ledger.json, and optionally cross-checks it against findings.json.
//   node validate-ledger.mjs coverage-ledger.json [--findings findings.json] [--root <dir>]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENUMS, safeResolve, isFile } from './lib.mjs';

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

export function validateLedger(doc, { findings, root } = {}) {
  const problems = [];
  const add = (id, m) => problems.push({ id, message: m });
  if (!doc || !isStr(doc.target)) add('-', 'target is required');
  if (!doc || !Array.isArray(doc.units) || doc.units.length === 0) return [...problems, { id: '-', message: 'units must be a non-empty array' }];
  const seen = new Set();
  const known = findings ? new Set(findings.findings.map((f) => f.id)) : null;
  const referenced = new Set();
  for (const u of doc.units) {
    const id = u.id || '(no id)';
    if (!/^U-\d{2,3}$/.test(id)) add(id, 'id must look like U-01');
    if (seen.has(id)) add(id, 'duplicate id');
    seen.add(id);
    if (!isStr(u.path)) add(id, 'path is required');
    if (!ENUMS.kind.includes(u.kind)) add(id, `kind must be one of ${ENUMS.kind.join(', ')}`);
    if (!ENUMS.risk.includes(u.risk)) add(id, 'risk must be high, medium or low');
    if (!ENUMS.unitStatus.includes(u.status)) add(id, `status must be one of ${ENUMS.unitStatus.join(', ')}`);
    if (root && isStr(u.path)) {
      const full = safeResolve(root, u.path);
      if (!full || !isFile(full)) add(id, `path "${u.path}" is not a file in the target`);
    }
    const fids = Array.isArray(u.findings) ? u.findings : [];
    for (const fid of fids) {
      referenced.add(fid);
      if (known && !known.has(fid)) add(id, `refers to unknown finding ${fid}`);
    }
    if (u.status === 'hunted') {
      if (!Array.isArray(u.classes_checked) || u.classes_checked.length === 0) add(id, 'a hunted unit must list classes_checked');
      if (fids.length === 0 && !isStr(u.note)) add(id, 'a hunted unit with no findings needs a note saying what was checked');
    }
    if (u.status === 'skipped' && !isStr(u.note)) add(id, 'a skipped unit needs a note saying why');
    if (u.status === 'not_started' && u.risk === 'high') add(id, 'a high-risk unit is still not_started');
  }
  if (known) for (const k of known) if (!referenced.has(k)) add(k, 'finding is not attached to any ledger unit');
  return problems;
}

function main(argv) {
  const args = argv.slice(2);
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const fFile = val('--findings');
  const root = val('--root') ? resolve(val('--root')) : undefined;
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--findings' && args[i - 1] !== '--root');
  if (!file || args.includes('--help')) {
    console.log('usage: validate-ledger.mjs coverage-ledger.json [--findings findings.json] [--root <dir>]');
    return args.includes('--help') ? 0 : 2;
  }
  let doc, findings;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); if (fFile) findings = JSON.parse(readFileSync(fFile, 'utf8')); } catch (e) { console.error(`cannot read input: ${e.message}`); return 2; }
  const problems = validateLedger(doc, { findings, root });
  if (problems.length) { for (const p of problems) console.log(`${p.id}: ${p.message}`); console.log(`${problems.length} problem(s)`); return 1; }
  const by = (s) => doc.units.filter((u) => u.status === s).length;
  console.log(`ok: ${doc.units.length} unit(s): ${by('hunted')} hunted, ${by('skipped')} skipped, ${by('not_started')} not started`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv));
