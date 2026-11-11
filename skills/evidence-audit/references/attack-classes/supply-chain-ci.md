# Supply chain and CI/CD

## Look for

- **Untrusted code with secrets**: a workflow on `pull_request_target` or `workflow_run` that checks out and runs the pull request's code, or exposes secrets to it.
- **Script injection in workflows**: `${{ github.event.* }}` values (titles, branch names, comments) interpolated into `run:` steps.
- **Over-broad permissions**: `permissions: write-all`, long-lived deploy tokens, tokens available to every job.
- **Unpinned actions and images**: third-party actions by tag or branch instead of a full commit hash, `latest` images, unpinned install scripts piped to a shell.
- **Dependencies**: no lock file, wildcards, packages fetched from unexpected registries, typosquat-looking names, install scripts, known-vulnerable versions where a manifest shows them.
- **Build integrity**: artefacts built and published without provenance, unsigned releases, caches shared across trust levels.
- **Self-hosted runners** used for public repositories.

## Prove it

Show which trigger, what runs, and which secret or permission is reachable by whom.

## Not a finding

First-party actions pinned by tag in a private repository with minimal permissions, as a note at most.
