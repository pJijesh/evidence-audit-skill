# Process: scope and map

## 1. Scope

Write down, in one or two lines, before reading any code:

- the target (repository, folder, revision or commit)
- what is in scope and what is not (third-party code, generated code, tests)
- whether running anything is allowed (default: no)
- who will read the result

If the person has not said, assume static review of the folder you were pointed at, and say so.

## 2. Map

You are building a picture of where an attacker can push on the system, and splitting the work into units small enough to hunt properly.

List, with file paths:

- **Entry points**: routes, handlers, CLI arguments, message consumers, scheduled jobs, webhooks, file parsers.
- **Trust boundaries**: where data crosses from untrusted (a request, a file, a model, a third party) to trusted (a query, a command, a page, a decision).
- **Sensitive operations**: database queries, process execution, file access, outbound requests, deserialisation, authentication and session handling, cryptography, template rendering, privileged actions.
- **Configuration and pipelines**: CI workflows, deployment files, infrastructure definitions, container files, dependency manifests.
- **Agent tooling** if present: anything where a model's output chooses an action.

## The coverage ledger

Create `coverage-ledger.json` with one unit per file or tight group of files. For each unit record `kind`, `risk` (high where untrusted input reaches a sensitive operation), and `status` (`not_started`, `hunted` or `skipped`). The ledger is how you and the reader know what was and was not looked at.

Rules the validator enforces:

- A `hunted` unit lists the `classes_checked`.
- A `hunted` unit with no findings has a `note` saying what was checked.
- A `skipped` unit has a `note` saying why.
- No high-risk unit is left `not_started` at the end.
- Every finding is attached to a unit.

Order the work by risk: high-risk units first.
