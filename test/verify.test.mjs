import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyFindings } from '../skills/evidence-audit/scripts/verify-findings.mjs';
import { validateLedger } from '../skills/evidence-audit/scripts/validate-ledger.mjs';
import { buildReport } from '../skills/evidence-audit/scripts/report.mjs';
import { ENUMS } from '../skills/evidence-audit/scripts/lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'examples/target-app');
const load = (f) => JSON.parse(readFileSync(join(ROOT, 'examples', f), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const msgs = (doc, opts) => verifyFindings(doc, opts).map((p) => p.message);

test('the worked example verifies cleanly against its target', () => {
  assert.deepEqual(verifyFindings(load('findings.json'), { root: TARGET }), []);
});

test('the example ledger validates against the findings and the target', () => {
  assert.deepEqual(validateLedger(load('coverage-ledger.json'), { findings: load('findings.json'), root: TARGET }), []);
});

test('the example covers all three statuses and several classes', () => {
  const f = load('findings.json').findings;
  assert.deepEqual([...new Set(f.map((x) => x.status))].sort(), ['confirmed', 'needs_validation', 'rejected']);
  assert.ok(new Set(f.map((x) => x.class)).size >= 6);
});

test('a quote that is not in the file is caught', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].quote = 'row = DB.execute("SELECT 1")';
  assert.ok(msgs(d, { root: TARGET }).some((m) => m.includes('quote not found')));
});

test('a quote on the wrong lines is caught', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].start_line = 40; d.findings[0].evidence[0].end_line = 40;
  assert.ok(msgs(d, { root: TARGET }).some((m) => m.includes('quote not found')));
});

test('whitespace differences in a quote are tolerated', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].quote = '  ' + d.findings[0].evidence[0].quote.replace(/ /g, '   ') + '\n';
  assert.deepEqual(msgs(d, { root: TARGET }), []);
});

test('a missing file, a line past the end, and a reversed range are caught', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].file = 'nope.py';
  d.findings[1].evidence[0].start_line = 900; d.findings[1].evidence[0].end_line = 900;
  d.findings[2].evidence[0].start_line = 9; d.findings[2].evidence[0].end_line = 3;
  const m = msgs(d, { root: TARGET });
  assert.ok(m.some((x) => x.includes('does not exist')));
  assert.ok(m.some((x) => x.includes('has only')));
  assert.ok(m.some((x) => x.includes('before start_line')));
});

test('paths that escape the audited root are refused, not read', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].file = '../../package.json';
  assert.ok(msgs(d, { root: TARGET }).some((m) => m.includes('escapes the audited root')));
  d.findings[0].evidence[0].file = '/etc/passwd';
  assert.ok(msgs(d, { root: TARGET }).some((m) => m.includes('escapes the audited root')));
});

test('a data-flow step pointing past the end of a file is caught', () => {
  const d = clone(load('findings.json'));
  d.findings[0].data_flow[0] = 'app.py:9999 reads the value';
  assert.ok(msgs(d, { root: TARGET }).some((m) => m.includes('data_flow refers to app.py:9999')));
});

test('without --root, evidence is structurally checked but not verified', () => {
  const d = clone(load('findings.json'));
  d.findings[0].evidence[0].quote = 'made up';
  assert.deepEqual(msgs(d), []);
});

test('a confirmed finding must have evidence, data flow, attacker, verified_by and fix', () => {
  for (const field of ['evidence', 'data_flow', 'attacker', 'verified_by', 'fix']) {
    const d = clone(load('findings.json'));
    delete d.findings[0][field];
    assert.ok(msgs(d).length > 0, `missing ${field} was not caught`);
  }
});

test('needs_validation needs to_validate, rejected needs a reason and severity info', () => {
  const d = clone(load('findings.json'));
  const nv = d.findings.find((f) => f.status === 'needs_validation');
  const rj = d.findings.find((f) => f.status === 'rejected');
  delete nv.to_validate; delete rj.rejection_reason; rj.severity = 'high';
  const m = msgs(d);
  assert.ok(m.some((x) => x.includes('to_validate')));
  assert.ok(m.some((x) => x.includes('rejection_reason')));
  assert.ok(m.some((x) => x.includes('severity info')));
});

test('bad ids, duplicate ids, enums and cwe format are caught', () => {
  const d = clone(load('findings.json'));
  d.findings[1].id = d.findings[0].id;
  d.findings[2].id = 'X-1';
  d.findings[3].severity = 'catastrophic';
  d.findings[4].class = 'vibes';
  d.findings[5].cwe = '89';
  const m = msgs(d);
  for (const needle of ['duplicate id', 'id must look like', 'severity must be', 'class must be', 'cwe must look like']) assert.ok(m.some((x) => x.includes(needle)), needle);
});

test('malformed documents do not crash the verifier', () => {
  assert.ok(verifyFindings(null).length > 0);
  assert.ok(verifyFindings({ target: 'x', audited_at: '2026-01-01', findings: 'no' }).length > 0);
});

test('schema enums and the validator agree', () => {
  const schema = JSON.parse(readFileSync(join(ROOT, 'skills/evidence-audit/schema/findings.schema.json'), 'utf8'));
  const p = schema.properties.findings.items.properties;
  assert.deepEqual(ENUMS.status, p.status.enum);
  assert.deepEqual(ENUMS.severity, p.severity.enum);
  assert.deepEqual(ENUMS.class, p.class.enum);
});

test('ledger rules: notes, classes, unknown findings, orphan findings, high risk not started', () => {
  const findings = load('findings.json');
  const led = clone(load('coverage-ledger.json'));
  led.units[4].note = '';
  led.units[1].classes_checked = [];
  led.units[2].findings = ['F-999'];
  led.units[3].risk = 'high'; led.units[3].status = 'not_started';
  const m = validateLedger(led, { findings }).map((p) => p.message);
  for (const needle of ['needs a note', 'classes_checked', 'unknown finding F-999', 'not_started', 'not attached to any ledger unit']) assert.ok(m.some((x) => x.includes(needle)), needle);
});

test('the report is deterministic, lists severities in order, and matches the committed REPORT.md', () => {
  const a = buildReport(load('findings.json'), load('coverage-ledger.json'));
  assert.equal(a, buildReport(load('findings.json'), load('coverage-ledger.json')));
  assert.equal(a, readFileSync(join(ROOT, 'examples/REPORT.md'), 'utf8'));
  assert.ok(a.indexOf('F-001') < a.indexOf('F-008'));
  assert.match(a, /11 confirmed, 1 needing validation, 1 rejected/);
});

test('the report keeps needs_validation out of the confirmed section', () => {
  const r = buildReport(load('findings.json'), load('coverage-ledger.json'));
  const confirmed = r.slice(r.indexOf('## Confirmed findings'), r.indexOf('## Needs validation'));
  assert.ok(!confirmed.includes('F-012'));
  assert.ok(r.slice(r.indexOf('## Needs validation')).includes('F-012'));
});

const run = (script, ...args) => spawnSync(process.execPath, [join(ROOT, 'skills/evidence-audit/scripts', script), ...args], { encoding: 'utf8' });

test('CLI exit codes: 0 ok, 1 problems, 2 usage', () => {
  assert.equal(run('verify-findings.mjs', join(ROOT, 'examples/findings.json'), '--root', TARGET).status, 0);
  const dir = mkdtempSync(join(tmpdir(), 'ea-'));
  const bad = clone(load('findings.json')); bad.findings[0].evidence[0].quote = 'nope';
  writeFileSync(join(dir, 'f.json'), JSON.stringify(bad));
  assert.equal(run('verify-findings.mjs', join(dir, 'f.json'), '--root', TARGET).status, 1);
  assert.equal(run('verify-findings.mjs').status, 2);
  assert.equal(run('verify-findings.mjs', join(dir, 'missing.json')).status, 2);
  writeFileSync(join(dir, 'broken.json'), '{ not json');
  assert.equal(run('verify-findings.mjs', join(dir, 'broken.json')).status, 2);
  assert.equal(run('validate-ledger.mjs', join(ROOT, 'examples/coverage-ledger.json'), '--findings', join(ROOT, 'examples/findings.json'), '--root', TARGET).status, 0);
  assert.equal(run('report.mjs').status, 2);
});

test('the verifier says plainly when evidence was not checked', () => {
  const r = run('verify-findings.mjs', join(ROOT, 'examples/findings.json'));
  assert.match(r.stdout, /NOT verified/);
});

test('every quoted line in the example is genuinely vulnerable-looking code from the fixture, not invented', () => {
  const d = load('findings.json');
  for (const f of d.findings) for (const e of f.evidence || []) {
    const lines = readFileSync(join(TARGET, e.file), 'utf8').split('\n').slice(e.start_line - 1, e.end_line).join(' ').replace(/\s+/g, ' ');
    assert.ok(lines.includes(e.quote.replace(/\s+/g, ' ').trim()), `${f.id} ${e.file}:${e.start_line}`);
  }
});
