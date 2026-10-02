# Freelens v2 extension ABI — shipped binaries and process invocation

The binary half of the v2 extension contract: what an extension may ship
besides JavaScript, and how it runs it. The API half is
[`docs/v2-extension-api.md`](./v2-extension-api.md).

The two are kept apart because they have different failure modes. An API
mistake is a type error at build time. An ABI mistake is a binary that will not
run on somebody's machine, or an endpoint-protection alert on somebody's laptop.

## The contract in short

- **Code** is bundled JavaScript, with no runtime dependencies to resolve.
- **Everything else** is files in the tarball, executables included. The host
  extracts the whole tarball and keeps the files' mode bits.
- **The outside world** is reached through processes, not through native
  modules: an extension may ship executables and run them as child processes
  from its main entry point.

The host does nothing else with shipped executables. It reads no declaration of
them in the manifest and adds none of them to `PATH`, so a shipped tool is not
available in the Freelens terminal. An extension that ships executables gets no
error and no effect beyond the extracted files.

## Native modules: no

**There is no Node ABI in the v2 extension contract.** `.node` addons are not
supported.

A native addon is coupled to the host's ABI — Electron version, Node version,
platform, architecture — and nothing makes a compiled addon survive an Electron
upgrade. A standalone executable has no such coupling: it is spawned, not
linked, and it covers what an addon would have been wanted for.

## Running a shipped program

A main entry point runs it with `node:child_process`. A renderer entry point
has no Node ([C4](./v2-extension-api.md#c4-module-format-and-loading)), so it
asks its own main half to run the program over `Renderer.Ipc` / `Main.Ipc`. The
host adds no API for this.

The extension spawns the process itself, so the host imposes nothing and
**guarantees nothing** about the child's environment. That puts two
obligations on the author:

- **Pass an explicit `env`.** A child inherits the application's environment by
  default, and that environment is not a documented surface: it carries whatever
  the user's desktop session, the shell-sync feature and the packaging format
  put there, and it differs between a `.dmg`, a Snap and a development build.
  Pass the variables the tool needs rather than `{ ...process.env }`.
- **Pass an explicit `cwd`.** The application's working directory is
  unspecified and platform-dependent — on macOS a bundle launched from Finder
  starts at `/`. Derive one from `manifestPath` or from
  `getExtensionFileFolder()`.

## How an extension finds its own files

`LensExtension.manifestPath` is how an extension derives its own directory, and
`getExtensionFileFolder()` gives it a writable one keyed by `storeName`. The
renderer has no `__dirname`, so there `manifestPath` is the only route.

Because the whole tarball is extracted, `manifestPath` points at a real
directory. An extension reads its own non-code resources with `fs` in main, and
the renderer's `freelens-extension` scheme serves them from disk.

## Recommended layout

```text
bin/<process.platform>/<process.arch>/<command>
```

These are Node's normalized values, not `os.platform()` / `os.machine()`.
`process.arch` is normalized, so `arm64` means `arm64` everywhere, whereas
`os.machine()` passes `uname` through and yields `aarch64` on Linux for the same
architecture. `process.arch` also reports the architecture of the *running
build*, which is the right question when choosing a binary to spawn beside it.

| `process.platform` | `process.arch` |
| --- | --- |
| `darwin` | `arm64`, `x64` |
| `linux` | `arm64`, `x64` |
| `win32` | `arm64`, `x64`, `ia32` |

Note **`win32`, not `windows`**: the host's own `<resources>/<platform>/<arch>/`
tree spells it `windows`, so the two schemes must not be conflated.

The file name is the command name. On Windows the file is `flux.exe` and the
command is still `flux`; an extension invoking its own tool composes the suffix
itself (`process.platform === "win32" ? ".exe" : ""`).

An extension handles a platform it does not ship a binary for itself. Whether to
ship every platform or fetch the tool on first use is the author's choice:
shipping all of them makes a tarball with six copies of a tool, and fetching
makes the extension responsible for verifying what it downloaded. The host's own
binary download code is not exposed to extensions.

## Executable mode bits

The host applies each file's mode from the archive, masked by the process
umask. `npm pack` keeps `0755` in the tarball, so **the owner's execute bit
always survives**, which is the only bit that matters for spawning. The umask
can only remove bits, so the archive's mode is a ceiling: `755` under a umask of
`022` or `000`, `700` under `077`.

On Windows the concern does not exist — NTFS has no POSIX mode bits and
executability comes from the file extension — so the risk there is path length
and reserved characters in names.

## Code signing and endpoint protection

The host's own binaries are covered by the application's signature and
notarization. **An extension's are not.**

On macOS a spawned unsigned binary meets Gatekeeper. On Windows, an `.exe`
written into the user data directory and executed is exactly the shape endpoint
protection reacts to, and a network call from a spawned process can be reported
as a reverse shell. **Sign your binaries.**

## References

- [`docs/v2-extension-api.md`](./v2-extension-api.md) — the API contracts
- [`docs/v2-extension-migration.md`](./v2-extension-migration.md) — the porting guide
