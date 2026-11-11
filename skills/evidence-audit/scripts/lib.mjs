// Shared by the validators and the report builder. Zero dependencies.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, isAbsolute, relative, sep, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const FINDINGS_SCHEMA = JSON.parse(readFileSync(join(HERE, '..', 'schema', 'findings.schema.json'), 'utf8'));
export const LEDGER_SCHEMA = JSON.parse(readFileSync(join(HERE, '..', 'schema', 'coverage-ledger.schema.json'), 'utf8'));
const F = FINDINGS_SCHEMA.properties.findings.items.properties;
const U = LEDGER_SCHEMA.properties.units.items.properties;
export const ENUMS = {
  status: F.status.enum, class: F.class.enum, severity: F.severity.enum, likelihood: F.likelihood.enum, impact: F.impact.enum,
  kind: U.kind.enum, risk: U.risk.enum, unitStatus: U.status.enum,
};
export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

export const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Resolve a finding's file safely inside the audited root. Returns null if it escapes.
export function safeResolve(root, file) {
  if (typeof file !== 'string' || !file || isAbsolute(file) || file.includes('\0')) return null;
  const full = resolve(root, file);
  const rel = relative(resolve(root), full);
  if (rel.startsWith('..') || rel.split(sep).includes('..') || isAbsolute(rel)) return null;
  return full;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function isFile(p) {
  return existsSync(p) && statSync(p).isFile();
}
