# Contributing

Thanks for taking an interest. This is a small skill with small scripts: standard library only, deterministic output, plain wording.

## Ground rules

1. **Evidence first.** A new example finding must pass `verify-findings.mjs` against its target, with quotes copied from the file and not retyped.
2. **Fictional targets only.** Examples use invented code and organisations. Never commit code, findings or data from a real system, and never include real credentials.
3. **No working exploits.** Describe how a flaw would be triggered. Do not add payloads aimed at real targets.
4. **No dependencies** in the skill or the scripts. Test tooling uses `node:test`.
5. **Keep the statuses honest.** If something cannot be confirmed from the code, it is `needs_validation`.
6. **Do not copy other projects.** Write your own wording and examples.
7. **British English, plain tone, no long dashes.** A test fails if an em dash or en dash appears in a text file.

## Development

```bash
node --test                  # all tests
node scripts/build.mjs       # regenerate the adapters after editing core.md
node scripts/build.mjs --check
```

If you change `examples/target-app`, regenerate the findings so line numbers and quotes still match, then run `npm run verify:example` and the tests, and rebuild `examples/REPORT.md` with `report.mjs`.

## Suggesting an attack class or a check

Open a suggestion. Say what the flaw looks like in code, how to prove it, and what is commonly mistaken for it.
