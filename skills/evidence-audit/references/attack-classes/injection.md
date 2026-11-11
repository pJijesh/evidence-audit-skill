# Injection

Untrusted data becomes part of a command, query, page or template.

## Look for

- **SQL**: string concatenation, f-strings, `format`, template strings in a query. Safe: parameters or an ORM with bound values. Dynamic column or table names need an allow-list, parameters do not help there.
- **OS commands**: `shell=True`, `system`, `exec`, backticks, `child_process.exec`, `Runtime.exec` with a single string. Safe: an argument list with no shell and an allow-list of values.
- **NoSQL and query languages**: objects taken straight from JSON into a query (`{"$ne": ...}`), LDAP and XPath filters built by concatenation.
- **Cross-site scripting**: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `document.write`, unescaped template output (`|safe`, `{{{ }}}`), URLs in `href` or `src` from user data (`javascript:`).
- **Template injection**: user input used as the template, not as data in it.
- **Header and log injection**: user values in headers, redirects or log lines without stripping newlines.
- **Expression and code evaluation**: `eval`, `exec`, `Function(...)`, dynamic imports from user input.

## Prove it

Trace the value from the request to the sink. Look for escaping at the sink, not just validation at the edge. Check the framework default before you decide.

## Not a finding

Constants in the string, values from a fixed allow-list, the user's own input rendered only to themselves, scripts that run only on trusted input.
