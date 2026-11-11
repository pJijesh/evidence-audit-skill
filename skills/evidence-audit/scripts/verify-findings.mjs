#!/usr/bin/env node
// Validates findings.json and, with --root, checks that every piece of evidence really exists in the target.
//   node verify-findings.mjs findings.json [--root <audited-dir>] [--json]
// Exit 0: valid. Exit 1: problems found. Exit 2: usage or unreadable input.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENUMS, norm, safeResolve, isFile } from './lib.mjs';

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isInt = (v) => Number.isInteger(v) && v >= 1;

export function verifyFindings(doc, { root } = {}) {
  const problems = [];
  const add = (id, msg) => problems.push({ id, message: msg });
  if (!doc || typeof doc !== 'object') return [{ id: '-', message: 'document is not an object' }];
  if (!isStr(doc.target)) add('-', 'target is required');
  if (!isStr(doc.audited_at) || !/^\d{4}-\d{2}-\d{2}$/.test(doc.audited_at)) add('-', 'audited_at must be YYYY-MM-DD');
  if (!Array.isArray(doc.findings)) return [...problems, { id: '-', message: 'findings must be an array' }];
  const seen = new Set();
  const cache = new Map();
  const lines = (full) => {
    if (!cache.has(full)) cache.set(full, readFileSync(full, 'utf8').split(/\r?\n/));
    return cache.get(full);
  };
  for (const f of doc.findings) {
    const id = f && f.id ? String(f.id) : '(no id)';
    if (!/^F-\d{3}$/.test(id)) add(id, 'id must look like F-001');
    if (seen.has(id)) add(id, 'duplicate id');
    seen.add(id);
    if (!ENUMS.status.includes(f.status)) add(id, `status must be one of ${ENUMS.status.join(', ')}`);
    if (!isStr(f.title)) add(id, 'title is required');
    if (!ENUMS.class.includes(f.class)) add(id, `class must be one of ${ENUMS.class.join(', ')}`);
    if (!ENUMS.severity.includes(f.severity)) add(id, `severity must be one of ${ENUMS.severity.join(', ')}`);
    if (f.likelihood !== undefined && !ENUMS.likelihood.includes(f.likelihood)) add(id, 'likelihood must be high, medium or low');
    if (f.impact !== undefined && !ENUMS.impact.includes(f.impact)) add(id, 'impact must be high, medium or low');
    if (f.cwe !== undefined && !/^CWE-\d+$/.test(f.cwe)) add(id, 'cwe must look like CWE-89');
    if (!isStr(f.summary)) add(id, 'summary is required');
    const evidence = Array.isArray(f.evidence) ? f.evidence : [];
    if (f.status === 'confirmed') {
      if (evidence.length === 0) add(id, 'a confirmed finding needs at least one piece of evidence');
      if (!Array.isArray(f.data_flow) || f.data_flow.length < 1) add(id, 'a confirmed finding needs a data_flow from input to the dangerous operation');
      if (!isStr(f.attacker)) add(id, 'a confirmed finding needs attacker (who can trigger it)');
      if (!isStr(f.verified_by)) add(id, 'a confirmed finding needs verified_by (how a second pass checked it)');
      if (!isStr(f.fix)) add(id, 'a confirmed finding needs a fix');
    }
    if (f.status === 'needs_validation' && !isStr(f.to_validate)) add(id, 'needs_validation requires to_validate');
    if (f.status === 'rejected' && !isStr(f.rejection_reason)) add(id, 'rejected requires rejection_reason');
    if (f.status === 'rejected' && f.severity !== 'info') add(id, 'a rejected finding should carry severity info so it cannot be mistaken for a live issue');
    if (root && Array.isArray(f.data_flow)) {
      for (const step of f.data_flow) {
        for (const m of String(step).matchAll(/([\w./@-]+\.[\w]+):(\d+)/g)) {
          const full = safeResolve(root, m[1]);
          if (!full || !isFile(full)) continue;
          if (Number(m[2]) > lines(full).length) add(id, `data_flow refers to ${m[1]}:${m[2]} but the file has ${lines(full).length} lines`);
        }
      }
    }
    evidence.forEach((e, i) => {
      const where = `evidence[${i}]`;
      if (!isStr(e.file)) return add(id, `${where}.file is required`);
      if (!isInt(e.start_line) || !isInt(e.end_line)) return add(id, `${where} needs integer start_line and end_line of at least 1`);
      if (e.end_line < e.start_line) return add(id, `${where} end_line is before start_line`);
      if (!isStr(e.quote)) return add(id, `${where}.quote is required`);
      if (!root) return;
      const full = safeResolve(root, e.file);
      if (!full) return add(id, `${where}.file "${e.file}" is absolute or escapes the audited root`);
      if (!isFile(full)) return add(id, `${where}.file "${e.file}" does not exist in the target`);
      const all = lines(full);
      if (e.end_line > all.length) return add(id, `${where} ${e.file} has only ${all.length} lines, evidence ends at ${e.end_line}`);
      const window = norm(all.slice(e.start_line - 1, e.end_line).join('\n'));
      if (!window.includes(norm(e.quote))) add(id, `${where} quote not found in ${e.file} lines ${e.start_line}-${e.end_line}`);
    });
  }
  return problems;
}

function main(argv) {
  const args = argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? resolve(args[rootIdx + 1] || '') : undefined;
  const json = args.includes('--json');
  const file = args.find((a, i) => !a.startsWith('--') && !(rootIdx >= 0 && i === rootIdx + 1));
  if (!file || args.includes('--help')) {
    console.log('usage: verify-findings.mjs findings.json [--root <audited-dir>] [--json]');
    return args.includes('--help') ? 0 : 2;
  }
  let doc;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`cannot read ${file}: ${e.message}`); return 2; }
  const problems = verifyFindings(doc, { root });
  if (json) console.log(JSON.stringify({ ok: problems.length === 0, checked_evidence: Boolean(root), problems }, null, 2));
  else if (problems.length) {
    for (const p of problems) console.log(`${p.id}: ${p.message}`);
    console.log(`${problems.length} problem(s)`);
  } else console.log(`ok: ${doc.findings.length} finding(s)${root ? ', evidence verified against the target' : ', evidence NOT verified (no --root)'}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv));
