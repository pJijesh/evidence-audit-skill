# Security audit: target-app (Kettle Lane Bookings, fictional)

Audited on 2026-11-11 at revision example. Generated from `findings.json`; do not edit by hand.

## Summary

11 confirmed, 1 needing validation, 1 rejected.

| ID | Severity | Class | Title |
| --- | --- | --- | --- |
| F-001 | critical | injection | SQL injection in the login query |
| F-002 | critical | injection | Command injection in the export route |
| F-010 | critical | supply-chain-ci | Pull request workflow runs untrusted code with a secret |
| F-011 | critical | llm-agents | Support agent runs a model-chosen shell command built from ticket text |
| F-003 | high | authn-authz | Admin export has no authentication or authorisation |
| F-004 | high | authn-authz | Any logged-in user can read any booking |
| F-005 | high | deserialization-ssrf-files | Path traversal in the invoice download |
| F-006 | high | deserialization-ssrf-files | Server-side request forgery in the preview route |
| F-007 | high | secrets-crypto | Hard-coded session signing key |
| F-009 | high | cloud-iac | Debug mode on and listening on all interfaces |
| F-008 | medium | secrets-crypto | Passwords hashed with unsalted MD5 |

## Coverage

5 units: 4 hunted, 1 skipped, 0 not started.

- U-05 `README.md` (skipped): Documentation only; contains no code or configuration.

## Confirmed findings

### F-001: SQL injection in the login query

Severity: critical. CWE-89. Class: injection.

The login route builds its SQL by inserting the submitted user name into the query text with an f-string, so a crafted name changes the query.

**Who can trigger it:** Anyone who can reach /login. No account is needed.

**Impact:** Authentication can be bypassed and the users table read, because the name is trusted as SQL.

**Evidence**

`app.py:19`

```
row = DB.execute(f"SELECT id FROM users WHERE name = '{user}' AND pw = '{pw_hash}'").fetchone()
```

**Data flow**

1. app.py:17 reads the user name from request.form with no validation
2. app.py:19 inserts it into an f-string SQL statement
3. app.py:19 executes the statement with DB.execute

**Fix:** Use a parameterised query: DB.execute('SELECT id FROM users WHERE name = ? AND pw = ?', (user, pw_hash)).

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-002: Command injection in the export route

Severity: critical. CWE-78. Class: injection.

The export route appends the fmt query parameter to a shell command and runs it with shell=True.

**Who can trigger it:** Anyone who can reach /admin/export; see F-003, there is no authentication on the route.

**Impact:** Arbitrary commands run as the web process.

**Evidence**

`app.py:49`

```
out = subprocess.check_output("export-tool --format " + fmt, shell=True)
```

**Data flow**

1. app.py:48 reads fmt from request.args with no allow-list
2. app.py:49 concatenates it into a command string
3. app.py:49 runs the string through a shell with shell=True

**Fix:** Check fmt against an allow-list (csv, json), and pass an argument list without shell=True.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-010: Pull request workflow runs untrusted code with a secret

Severity: critical. CWE-829. Class: supply-chain-ci.

The workflow triggers on pull_request_target, checks out the pull request's own commit, runs its dependencies and tests, and passes a deploy token into that step.

**Who can trigger it:** Anyone who can open a pull request, including from a fork.

**Impact:** The deploy token can be stolen by a test file or a dependency in the pull request.

**Evidence**

`.github/workflows/ci.yml:3`

```
pull_request_target:
```

`.github/workflows/ci.yml:12`

```
ref: ${{ github.event.pull_request.head.sha }}
```

`.github/workflows/ci.yml:15`

```
DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

**Data flow**

1. .github/workflows/ci.yml:3 runs with the base repository's secrets in the context of a pull request
2. .github/workflows/ci.yml:10 and .github/workflows/ci.yml:12 check out the attacker-controlled head commit
3. .github/workflows/ci.yml:13 installs and runs code from that commit
4. .github/workflows/ci.yml:15 exposes DEPLOY_TOKEN to that code

**Fix:** Use the pull_request trigger for untrusted code, keep secrets out of that job, and if pull_request_target is needed, do not check out or run the head commit.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-011: Support agent runs a model-chosen shell command built from ticket text

Severity: critical. CWE-78. Class: llm-agents.

Ticket text, written by customers, is passed to the model, and whatever command the model returns is executed in a shell with no allow-list and no approval.

**Who can trigger it:** Anyone who can submit a support ticket, using prompt injection in the ticket text.

**Impact:** Arbitrary commands run as the agent's process.

**Evidence**

`agent.py:8`

```
plan = complete("You are a support agent. Decide a shell command to resolve this ticket:\n" + ticket_text)
```

`agent.py:9`

```
return subprocess.run(plan, shell=True, capture_output=True, text=True).stdout
```

**Data flow**

1. agent.py:8 puts untrusted ticket_text into the prompt
2. agent.py:8 takes the model's reply as a command
3. agent.py:9 runs it with shell=True and returns the output

**Fix:** Do not execute model output. Offer a fixed set of typed actions with parameter validation, run them with least privilege, and require human approval for anything that changes state.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-003: Admin export has no authentication or authorisation

Severity: high. CWE-306. Class: authn-authz.

Other routes check the session, but /admin/export checks nothing, so the admin function is open to anyone.

**Who can trigger it:** Anyone who can reach the application.

**Impact:** An unauthenticated user can trigger the export, and with F-002 run commands.

**Evidence**

`app.py:46-47`

```
@app.route("/admin/export")
def export():
```

**Data flow**

1. app.py:46 registers the route
2. app.py:47 the handler goes straight to the export with no session or role check

**Fix:** Require a logged-in user with an admin role before the handler body runs, and deny by default.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-004: Any logged-in user can read any booking

Severity: high. CWE-639. Class: authn-authz.

The booking route checks that someone is logged in, but not that the booking belongs to them, so changing the id returns other people's bookings.

**Who can trigger it:** Any registered user.

**Impact:** Guest details for every booking can be enumerated by counting ids.

**Evidence**

`app.py:30`

```
row = DB.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
```

**Data flow**

1. app.py:27 takes booking_id from the URL
2. app.py:28 only checks that a session exists
3. app.py:30 selects the row by id with no owner condition

**Fix:** Add the owner to the query (AND user_id = ?) with session['uid'], and return 404 when no row matches.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-005: Path traversal in the invoice download

Severity: high. CWE-22. Class: deserialization-ssrf-files.

The file parameter is joined to the invoices folder and sent back without checking where it resolves, so ../ sequences or an absolute path escape the folder.

**Who can trigger it:** Anyone who can reach /invoice.

**Impact:** Arbitrary files readable by the web process can be downloaded, including the database and keys.

**Evidence**

`app.py:36`

```
name = request.args.get("file", "latest.pdf")
```

`app.py:37`

```
return send_file(os.path.join("invoices", name))
```

**Data flow**

1. app.py:36 reads file from request.args
2. app.py:37 joins it to 'invoices' with os.path.join, which discards the folder if the value is an absolute path
3. app.py:37 sends whatever file results

**Fix:** Use flask.send_from_directory('invoices', name), which rejects traversal, and allow only known file names.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-006: Server-side request forgery in the preview route

Severity: high. CWE-918. Class: deserialization-ssrf-files.

The preview route fetches any URL supplied by the caller and returns the body, so the server can be made to request internal addresses.

**Who can trigger it:** Anyone who can reach /preview.

**Impact:** Internal services and cloud metadata endpoints can be read through the server.

**Evidence**

`app.py:42`

```
url = request.args["url"]
```

`app.py:43`

```
return requests.get(url, timeout=5).text
```

**Data flow**

1. app.py:42 reads url from request.args
2. app.py:43 requests it with no scheme, host or address check
3. app.py:43 returns the response body to the caller

**Fix:** Allow-list hosts, resolve and block private and link-local ranges, disallow redirects, and return only what is needed.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-007: Hard-coded session signing key

Severity: high. CWE-798. Class: secrets-crypto.

The Flask secret key is a literal in the source, so anyone with the repository can forge session cookies.

**Who can trigger it:** Anyone who can read the source, then send a forged cookie with any uid.

**Impact:** Impersonation of any user, including administrators if roles are ever added.

**Evidence**

`app.py:11`

```
app.secret_key = "kettle-lane-secret-2024"
```

**Data flow**

1. app.py:11 sets the signing key to a constant string
2. app.py:21 and app.py:28 trust the session contents signed with it

**Fix:** Load the key from the environment or a secret store, generate a long random value, and rotate the key now that it is public.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

### F-009: Debug mode on and listening on all interfaces

Severity: high. CWE-489. Class: cloud-iac.

The entry point starts the development server with debug=True on 0.0.0.0, which exposes the interactive debugger to the network.

**Who can trigger it:** Anyone on the network who can trigger an error page, if the server is started this way.

**Impact:** Code execution through the debugger console.

**Evidence**

`app.py:54`

```
app.run(host="0.0.0.0", debug=True)
```

**Data flow**

1. app.py:54 binds to every interface
2. app.py:54 enables debug mode, which serves an interactive debugger on errors

**Fix:** Never run the development server in production: use a production server, bind to localhost behind a proxy, and set debug from configuration that defaults to off.

**Checked by:** A second pass confirmed the line is reached when the module is run directly. Whether production runs it this way was not visible in the repository.

### F-008: Passwords hashed with unsalted MD5

Severity: medium. CWE-328. Class: secrets-crypto.

Passwords are stored as plain MD5 digests, which are fast to brute force and identical for identical passwords.

**Who can trigger it:** Anyone who obtains the users table, for example through F-001.

**Impact:** Most passwords can be recovered quickly offline.

**Evidence**

`app.py:18`

```
pw_hash = hashlib.md5(request.form["password"].encode()).hexdigest()
```

**Data flow**

1. app.py:18 hashes the submitted password with MD5 and no salt
2. app.py:19 compares it with the stored value

**Fix:** Use a slow password hash such as argon2id or bcrypt through a maintained library, and migrate existing hashes on next login.

**Checked by:** A second pass re-read the route from request to sink and found no validation, escaping or authorisation in between.

## Needs validation

These are plausible but were not confirmed from the code alone. Do not treat them as vulnerabilities until tested.

### F-012: Guest note is rendered as HTML

Suspected severity: high. Class: injection.

The page assigns guest_note to innerHTML, which would run any script in it. Whether an outsider can set guest_note could not be seen, because the code that writes it is not in this snapshot.

**To validate:** Find where guest_note is written (not in this repository snapshot). If guests or other low-privilege users can set it and staff view it, this becomes a confirmed stored XSS: test by saving a note with a harmless marker element and loading it as staff.

`static/app.js:5`

```
document.getElementById("note").innerHTML = data.guest_note;
```

## Rejected

Candidates that were investigated and disproved. They are listed so the work is not repeated.

- F-013 Search box value inserted as HTML: The value comes from the user's own keystrokes in their own browser. There is no way for another person to set it through a link or stored data, so this is self-XSS with no attacker. Worth tidying with textContent, but not a vulnerability.
