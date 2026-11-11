import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan, apply, upsertBlock, TARGETS } from '../scripts/install.mjs';
import { agentsBlock, outputs, BLOCK_START, BLOCK_END } from '../scripts/build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'asd-'));

test('claude install copies the whole skill, including the linter', () => {
  const dir = tmp();
  apply(plan('claude', { dir }));
  const base = join(dir, '.claude', 'skills', 'evidence-audit');
  for (const f of ['SKILL.md', 'scripts/verify-findings.mjs', 'scripts/report.mjs', 'schema/findings.schema.json', 'references/process.md']) assert.ok(existsSync(join(base, f)), f);
});

test('the installed linter runs from the install location', () => {
  const dir = tmp();
  apply(plan('claude', { dir }));
  const r = spawnSync(process.execPath, [join(dir, '.claude/skills/evidence-audit/scripts/verify-findings.mjs'), join(ROOT, 'examples/findings.json'), '--root', join(ROOT, 'examples/target-app')], { encoding: 'utf8' });
  assert.equal(r.status, 0);
});

test('codex and opencode merge a marked block into AGENTS.md with the real linter path', () => {
  for (const t of ['codex', 'opencode']) {
    const dir = tmp();
    writeFileSync(join(dir, 'AGENTS.md'), '# Project rules\n\nBe kind.\n');
    apply(plan(t, { dir }));
    const text = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(text.startsWith('# Project rules'));
    assert.ok(text.includes(BLOCK_START) && text.includes(BLOCK_END));
    assert.ok(!text.includes('{{SCRIPTS}}'));
    assert.ok(text.includes(join(dir, t === 'codex' ? '.agents' : '.opencode', 'skills', 'evidence-audit', 'scripts', 'verify-findings.mjs')));
  }
});

test('installing twice does not duplicate the AGENTS.md block', () => {
  const dir = tmp();
  apply(plan('codex', { dir }));
  apply(plan('codex', { dir }));
  const text = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(text.split(BLOCK_START).length - 1, 1);
});

test('cursor gets a .mdc rule with frontmatter and the linter path filled in', () => {
  const dir = tmp();
  apply(plan('cursor', { dir }));
  const text = readFileSync(join(dir, '.cursor/rules/evidence-audit.mdc'), 'utf8');
  assert.ok(text.startsWith('---\ndescription:'));
  assert.ok(text.includes('alwaysApply: false'));
  assert.ok(!text.includes('{{SCRIPTS}}'));
  assert.ok(existsSync(join(dir, '.cursor/evidence-audit/scripts/verify-findings.mjs')));
});

test('dry run writes nothing', () => {
  const dir = tmp();
  const log = apply(plan('claude', { dir }), true);
  assert.ok(log.length > 0);
  assert.ok(!existsSync(join(dir, '.claude')));
});

test('upsertBlock replaces an existing block and keeps surrounding text', () => {
  const first = upsertBlock('top\n', agentsBlock());
  const edited = first.replace('Phases', 'PHASES-EDITED');
  const second = upsertBlock(edited + 'bottom\n', agentsBlock());
  assert.ok(second.includes('top') && second.includes('bottom'));
  assert.ok(!second.includes('PHASES-EDITED'));
  assert.equal(second.split(BLOCK_START).length - 1, 1);
});

test('the CLI handles unknown targets and --dry-run', () => {
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'scripts/install.mjs'), ...a], { encoding: 'utf8' });
  assert.equal(run('banana').status, 2);
  assert.equal(run().status, 2);
  const dir = tmp();
  const r = run('all', '--dir', dir, '--dry-run');
  assert.equal(r.status, 0);
  for (const t of TARGETS) assert.ok(r.stdout.includes(t));
});

test('committed generated files are current', () => {
  for (const [path, text] of Object.entries(outputs())) assert.equal(readFileSync(path, 'utf8'), text, path);
});

test('the CLI accepts a target as the first argument when --dir is not given', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/install.mjs'), 'all', '--dry-run'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  for (const t of TARGETS) assert.ok(r.stdout.includes(t));
  const one = spawnSync(process.execPath, [join(ROOT, 'scripts/install.mjs'), 'claude', '--dry-run'], { encoding: 'utf8' });
  assert.equal(one.status, 0, one.stderr);
});
