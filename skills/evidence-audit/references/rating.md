# Rating

Rate each confirmed or suspected finding on three things, and write the reason in the summary.

- **Likelihood**: how easy is it to trigger? High: no account or special knowledge, one request. Medium: needs an account, a victim action, or a specific condition. Low: needs a rare precondition or a privileged position.
- **Impact**: what is lost? High: code execution, takeover of accounts or the system, bulk exposure of sensitive data, money or safety. Medium: limited data exposure or integrity loss. Low: minor information leakage.
- **Severity**: from the combination.

| | Impact high | Impact medium | Impact low |
| --- | --- | --- | --- |
| Likelihood high | critical | high | medium |
| Likelihood medium | high | medium | low |
| Likelihood low | medium | low | info |

Move a rating up or down one step if the context justifies it, and say why. Examples: the system is internet-facing and holds regulated data (up), the flaw is only reachable by an administrator (down).

`needs_validation` findings carry the severity they would have if confirmed. `rejected` findings carry `info`.

Do not invent a score. If you want a CVSS vector, derive it from the facts you can show, and do not present it as more precise than the evidence.
