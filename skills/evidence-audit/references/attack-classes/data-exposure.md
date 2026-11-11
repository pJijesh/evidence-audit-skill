# Data exposure

## Look for

- **Over-sharing in responses**: whole database rows or objects returned where the client needs two fields (password hashes, internal ids, other users' details).
- **Verbose errors**: stack traces, SQL errors and paths shown to users.
- **Sensitive data in logs**, analytics, error reporting and URLs.
- **Backups, exports and dumps** committed or served from web-accessible folders; `.git`, `.env` and backup files reachable.
- **Missing retention and deletion** for personal data where the code shows it is stored.
- **Insecure transport**: HTTP for sensitive calls, mixed content, missing HSTS.
- **Client-side storage** of tokens or personal data in `localStorage` where script injection would expose it.
- **Cross-tenant leakage**: caches and queries that do not include the tenant.
- **Weak response headers**: missing content security policy or frame protection, where relevant to a real issue.

## Prove it

Show what is returned or stored, who can read it, and why they should not be able to.

## Not a finding

Public data that is meant to be public, or headers noted as hardening advice. Report those as `info`, not as vulnerabilities.
