# Secrets and cryptography

## Look for

- **Secrets in the repository**: keys, tokens, passwords, connection strings, private keys in code, config, tests, scripts and history. Check that a value is real, not a placeholder. If a real one is found, it must be rotated, not just removed.
- **Hard-coded signing and encryption keys**, including framework secret keys and JWT secrets.
- **Weak password storage**: MD5, SHA-1, plain SHA-256, or any fast hash without a salt. Safe: argon2id, bcrypt, scrypt, PBKDF2 with a high cost.
- **Weak or misused algorithms**: ECB mode, static or reused IVs and nonces, DES or RC4, small RSA keys, custom crypto.
- **Weak randomness for security values**: `random`, `Math.random`, timestamps used for tokens, reset codes or keys. Safe: `secrets`, `crypto.randomBytes`, `SecureRandom`.
- **Certificate checks switched off**: `verify=False`, `rejectUnauthorized: false`, trust-all managers.
- **Secrets in logs, errors and URLs.**

## Prove it

Say what the value protects and who can read it. A hash used for a cache key or a checksum is not a password hash.

## Not a finding

Placeholders, example values, test fixtures that are clearly fake and not reused in production.
