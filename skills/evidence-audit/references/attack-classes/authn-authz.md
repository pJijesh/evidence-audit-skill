# Authentication and authorisation

## Look for

- **Missing authentication**: routes, admin functions, internal APIs and webhooks with no check. Compare each route with its siblings, because the odd one out is often the bug.
- **Missing authorisation (broken object level access)**: the code checks that someone is logged in, but not that the object belongs to them. Look for lookups by id with no owner condition.
- **Function level access**: admin or privileged actions available to ordinary roles. Checks done only in the client.
- **Mass assignment**: a request body copied onto a model, including fields like `role` or `is_admin`.
- **Session handling**: predictable or long-lived tokens, no expiry or rotation on login and logout, tokens in URLs, missing `HttpOnly`, `Secure` and `SameSite`.
- **Login and recovery**: no rate limiting, account enumeration through different messages, weak reset tokens, reset links that do not expire.
- **CSRF**: state-changing requests authenticated by cookie alone with no token or `SameSite` protection.
- **JWT and tokens**: `alg: none`, unverified signatures, the key taken from the token, no audience or expiry check.
- **Default and hard-coded credentials.**

## Prove it

Find the middleware or decorator that should apply, and check whether it does for this route. Check for deny-by-default behaviour.

## Not a finding

Public routes that are meant to be public, if the intent is clear and they expose nothing sensitive.
