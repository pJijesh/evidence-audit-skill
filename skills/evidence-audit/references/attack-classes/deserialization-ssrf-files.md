# Deserialisation, outbound requests and files

## Look for

- **Unsafe deserialisation**: `pickle.loads`, `yaml.load` without a safe loader, Java `ObjectInputStream`, .NET `BinaryFormatter`, PHP `unserialize`, Node libraries that evaluate code on parse, on data that comes from outside.
- **Server-side request forgery**: the server fetches a URL, host or file supplied by the caller. Look at webhooks, link previews, image and PDF fetchers, importers and proxies. Check redirects, DNS rebinding and alternative address forms.
- **Path traversal**: user input joined to a path. `os.path.join` with an absolute second argument discards the first. Check archive extraction (zip slip), file uploads, downloads, and static file serving.
- **Unrestricted upload**: type, size, name and storage location, and whether uploads are served back with an executable type.
- **XML**: external entities and DTD processing enabled.
- **Open redirects** where a redirect target comes from a parameter.
- **Race conditions on files** (check then use) where they matter.

## Prove it

Show what the attacker supplies and where it lands. For SSRF, show whether the response is returned (full) or only the effect is visible (blind).

## Not a finding

Fixed URLs and paths, inputs checked against an allow-list, deserialising only data the application itself produced and signed.
