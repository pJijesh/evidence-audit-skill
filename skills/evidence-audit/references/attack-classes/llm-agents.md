# LLM applications and agents

## Look for

- **Model output executed**: model text passed to a shell, `eval`, a database, an HTTP client or a file path without an allow-list or approval.
- **Prompt injection reaching tools**: untrusted text (tickets, emails, web pages, documents, tool results) in the prompt of an agent that can take actions. The question is what the worst thing the model could be talked into doing is.
- **Excessive agency**: tools with broad rights, no per-action approval for state changes, one credential for everything.
- **Data leakage**: secrets or other users' data placed in prompts, retrieval across tenants, system prompts that contain secrets, outputs sent to third parties.
- **Insecure output handling**: model output rendered as HTML or Markdown with active content, or used to build links.
- **Retrieval and memory poisoning**: shared stores that any user can write to and any user's agent will read.
- **Unbounded consumption**: no limits on input size, tool loops, cost or rate.
- **Supply chain**: unpinned model or tool servers, downloaded model files in unsafe formats, third-party tool descriptions trusted without review.

## Prove it

Show the untrusted source, the prompt it reaches, and the tool it can influence, with the rights that tool has. Describe the attack in words; do not write a working injection payload for a real target.

## Not a finding

Model output that is only displayed as plain text to the person who asked, with no action taken.
