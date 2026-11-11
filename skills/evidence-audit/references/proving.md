# Proving: try to disprove it

Every candidate gets this treatment before it can be `confirmed`. Do it as if you were a sceptical reviewer who wants it to be wrong.

## The questions

1. **Source.** Can an attacker actually control the input? Who, and what do they need (an account, a link a victim clicks, network position)? If only the user themselves controls it, it is not an attack on anyone else.
2. **Path.** Trace it step by step to the dangerous operation. Write each step with `file:line`. If a step is missing, you do not have a finding yet.
3. **Controls.** Look for what would stop it: validation, escaping, parameterisation, allow-lists, authorisation checks, framework protections, middleware, network restrictions. Search the repository for them, not just the function.
4. **Reachability.** Is the code reachable in the deployed system, or dead, test-only or behind a flag?
5. **Impact.** What does the attacker gain that they did not already have?

## Outcomes

- You found the whole path and no control: `confirmed`.
- You could not see a part of the path (the write side of stored data, runtime config, a deployed setting, a dependency's behaviour): `needs_validation`, and say precisely what must be checked.
- You found the control, or there is no attacker: `rejected`, with the reason.

## Second pass

For each `confirmed` finding, do the trace again from the sink back to the source, fresh, without looking at your first write-up. Record in `verified_by` what you checked. If you are an agent that can start a separate fresh-context reviewer, use one; otherwise do it yourself after finishing the other findings, and say which.

## Common ways candidates are wrong

- A framework escapes or parameterises by default and you did not know.
- The value is validated in a layer above the one you read.
- The "attacker" is an administrator who could already do this.
- The code is a script, test or example that never runs in production.
- A scanner-style pattern matched (the word `exec`, `password`, `md5`) but the use is harmless (a checksum for caching, not a password).
