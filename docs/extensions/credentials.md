# Extension credentials

Use `Common.Credentials` from `@freelensapp/extensions` in either the main or
renderer process. Pass your extension's package name (`this.name` inside a
`LensExtension`) as `extensionId`. Do not use a custom `storeName` alias.

```ts
import { Common } from "@freelensapp/extensions";

import type { Main, Renderer } from "@freelensapp/extensions";

export async function saveGrafanaToken(
  extension: Main.LensExtension | Renderer.LensExtension,
  token: string,
): Promise<void> {
  await Common.Credentials.set(extension.name, "grafana-token", token);
}

export async function readGrafanaToken(
  extension: Main.LensExtension | Renderer.LensExtension,
): Promise<string | undefined> {
  return Common.Credentials.get(extension.name, "grafana-token");
}

export async function forgetGrafanaToken(
  extension: Main.LensExtension | Renderer.LensExtension,
): Promise<void> {
  await Common.Credentials.delete(extension.name, "grafana-token");
}

export async function listCredentialKeys(
  extension: Main.LensExtension | Renderer.LensExtension,
): Promise<string[]> {
  return Common.Credentials.list(extension.name);
}
```

All methods return promises. `get` returns `undefined` for a missing key; `set`
replaces an existing value; `delete` succeeds when the key is already absent.
`list` returns sorted keys for that extension, never values. Keys must be non-empty
and contain no slashes, backslashes or control characters. Package names may use
npm scopes, such as `@example/grafana`. The `core` scope is reserved for internal
application code and rejected by the public API and IPC listener. The interface
is available as `Common.CredentialsApi` for type annotations.

## Security model

Values are encrypted with the operating system secret store through Electron
[`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage): Keychain
on macOS, DPAPI on Windows, and the configured secret store on Linux. The encrypted
blobs are base64 encoded in a versioned `credentials.json` file in the application's
user-data directory. Namespaces and key names are readable metadata; do not put
secrets in them. This is encrypted local storage, not a separate keychain entry
for each credential.

Every operation rejects when encryption is unavailable, including Linux's
unprotected `basic_text` backend. Handle rejected promises and ask the user to
unlock or configure their OS secret store; never fall back to a plain JSON store.
Existing extension JSON stores are not migrated automatically.

The main process serializes operations on its singleton store. Updates write and
sync a mode-`0600` temporary file in the same directory, then rename it over the
previous file. POSIX permissions apply on macOS and Linux; Windows protection
also depends on the user-data directory's ACL. Invalid files and unknown format
versions are rejected without replacing them. Atomic replacement does not promise
power-loss durability on every filesystem or coordinate separate app processes.

**Scopes are not an extension security sandbox.** The request-channel adapter
does not pass the Electron sender event to the handler. It cannot authenticate
the calling extension. The wrapper supplies both `extensionId` and the same
`scope`; the listener rejects mismatches and `core`. Both fields are
caller-supplied, so a malicious extension can claim another extension's package
name. Main-process extensions also execute trusted application code. Install
only extensions you trust. OS encryption protects stored values, not secrets
exposed to compromised application code or all programs running as the same OS
user.

Plain values exist in application memory and cross local IPC when requested by a
renderer. The store does not log them. Extensions must avoid logging values or
placing them in ordinary preferences. Call the API after application startup,
for example from an extension's `onActivate` or a user action. Real keychain
access can prompt the user and synchronous `safeStorage` calls can block the main
process. Keep this API for small credentials, not large data.
