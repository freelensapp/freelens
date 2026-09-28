# Freelens v2 extension ABI — shipped binaries and process invocation

The binary half of the v2 extension contract: what an extension may ship
besides JavaScript, and how it runs it. The API half is
[`docs/v2-extension-api.md`](./v2-extension-api.md).

The two are kept apart because they have different failure modes and different
readers. An API mistake is a type error at build time. An ABI mistake is a
binary that will not run on somebody's machine, or an endpoint-protection alert
on somebody's laptop.

> ## Status in 2.0.0: specified, not implemented
>
> Everything in this document describes the intended contract. **In 2.0.0 the
> host does not act on any of it.** Concretely:
>
> - the host **does not read** a binaries declaration in the manifest;
> - it **adds nothing to `PATH`** from an extension;
> - an extension that ships executables gets **no error and no effect** — the
>   files are extracted like any other content and are simply never used.
>
> This is stated explicitly because silence would be read as "supported".
>
> Deferring costs nothing measurable: of the 24 published Freelens extensions,
> **none ships an executable** and none carries a `gypfile`. The capability is
> revisited when an extension actually wants it, against a real use case.
>
> Two things from this document **are** in effect in 2.0.0: the `.node`
> exclusion below, which costs no implementation, and extraction — #2400
> extracts the whole tarball, so shipped files land on disk with their mode bits
> intact whether or not anything uses them.
>
> Specifying the layout now is still worth doing, because it makes later support
> **additive**: an author who follows this convention today is correct tomorrow,
> and the host gains behaviour without the contract changing shape.

## The decision this starts from

**An extension may include executables in its tarball and invoke them as child
processes.**

That divides the contract cleanly:

- **code** — bundled JavaScript, no runtime dependencies to resolve;
- **everything else** — files in the tarball, executables included;
- **the outside world** — reached through processes, not through native modules.

A native Node addon is coupled to the host's ABI — Electron version, Node
version, platform, architecture — and no bundler solves that. A standalone
executable has no such coupling: it is spawned, not linked. The thing a bundler
cannot inline turns out to be the thing that does not need inlining.

The host already works this way on itself: kubectl, helm and
`freelens-k8s-proxy` are bundled executables located through
`bundled-binary-path.injectable.ts`. Extensions get a model that already exists
in the tree rather than a new invention.

## What the binaries are for

**Additional tools** — a flux extension contributing a `flux` command, an istio
extension contributing `istioctl`. Not for replacing what the host already
manages; see [Deliberately deferred](#deliberately-deferred).

## Native modules: no

**There is no Node ABI in the v2 extension contract.** `.node` addons are not
supported. This is a stated exclusion rather than an omission, because "not
mentioned" would be read as "allowed".

Nothing makes a compiled addon survive an Electron upgrade, and the executable
route covers what they would have been wanted for. The exclusion is supported by
evidence rather than by argument: no `gypfile` appears in any of the 24
published extensions, so nothing in the wild depends on the capability.

## Layout

```text
bin/<process.platform>/<process.arch>/<command>
```

Node's normalized values, not `os.platform()` / `os.machine()`. `process.arch`
is normalized, so `arm64` means `arm64` everywhere, whereas `os.machine()`
passes `uname` through and yields `aarch64` on Linux for the same architecture —
one table instead of three, and an author can predict it from their own machine.
`process.arch` also reports the architecture of the *running build*, which is
the right question when choosing a binary to spawn beside it.

The contract publishes the table, not the expression that computes it:

| `process.platform` | `process.arch` |
| --- | --- |
| `darwin` | `arm64`, `x64` |
| `linux` | `arm64`, `x64` |
| `win32` | `arm64`, `x64`, `ia32` |

Note **`win32`, not `windows`.** This deliberately differs from the host's own
internal spelling — `normalized-platform.injectable.ts` maps `win32` to
`windows` for its `<resources>/<platform>/<arch>/` tree — so the two schemes must
not be conflated.

The file name is the command name. On Windows the file is `flux.exe` and the
command is still `flux`; an extension invoking its own tool composes the suffix
itself (`process.platform === "win32" ? ".exe" : ""`).

A tuple an extension does not ship is not an error condition for this contract
to describe. The extension handles absence for its own use, and in the terminal
the user gets the shell's own "command not found".

**Ship every platform or fetch on first use** is left to the author. Shipping
all of them makes a tarball with six copies of a tool; fetching puts the
extension back in the business of verifying what it downloaded. The host's own
`packages/ensure-binaries` solves that problem but is **not** exposed to
extensions.

## Declared in the manifest, and laid out by convention

Both, not one instead of the other.

**The declaration is what makes the contents knowable before installing.**
Verified: npm preserves custom top-level manifest fields in registry metadata —
for `@freelensapp/fluxcd-extension@5.3.1` the packument carries `renderer`,
`copyright` and `engines.freelens` without fetching the tarball. So a binaries
block is readable from the same request the host already makes to resolve a
version, and `engines.freelens` is the precedent that a host contract already
travels this channel.

**The convention then says where the files sit**, which lets the host compare
declared against actual at install time. An extension that declares `flux` but
also carries `bash` is detectable without heuristics.

Detection belongs to delivery and is in scope for this contract. What the host
then does about a suspicious declaration — warn, refuse, surface in a store
listing — is policy and is not.

## PATH

Extension binary directories are **appended** to `pathSuffixEntries`, after the
shell's own `PATH`.

That placement *is* the priority rule. Host-managed tools come either from the
prefix (the cluster-matched kubectl, which must win) or are invoked by absolute
path (`helm-binary-path.injectable.ts`), so an extension shipping `kubectl`
simply loses, with no special case to write. The effective order is: an explicit
user setting, then the extension's own invocation, then the host's downloaded
kubectl, then the host's bundled binaries, then whatever the OS `PATH` provides.

Three properties that are a surprise otherwise, so the contract states them:

- **only enabled extensions contribute;**
- **the suffix is computed when a session opens**, so enabling an extension does
  not change an already-open terminal;
- where two extensions ship the same command, **the order is deterministic**
  (sorted extension id) rather than whatever the instance map happens to yield.

**A gap to fix when this is implemented.** `pathSuffixEntries` is currently
passed only by `standalone-shell-session/open.injectable.ts`, and
`shell-session.ts:424` documents the field as "Empty for a cluster session."
Implemented as written, a `flux` from an extension would be on `PATH` only in a
terminal opened *outside* a cluster — which is not where anyone would use it. It
must be appended for cluster sessions too.

## How an extension invokes what it ships

Three shapes were considered, cheapest first.

1. **`PATH` only.** A user can run what an extension shipped, in the Freelens
   terminal; the extension's own code cannot. Choosing only this would decide,
   quietly, that extensions do not run tools — a substantial contract statement
   rather than a scope reduction.
2. **`PATH`, plus main-process extensions keep `node:child_process`.** No new
   host API at all. Extensions already have a main/renderer split and their own
   IPC channel (`Main.Ipc`, `Renderer.Ipc`), so a renderer half that needs a
   binary asks its own main half to run it.
3. **A curated host API over `child_process`.** New, permanent surface —
   nothing in `common-api` or `main-api` exposes `child_process` today.

**Decided: 1 now, 2 as the answer for programmatic invocation, 3 deferred.**

Option 2 costs nothing and reuses structure extensions already have, so no host
API is added for it. It is only coherent while main keeps Node access, which
ties it to that decision. Option 3 becomes necessary if main's Node access is
ever closed, and is deferred until then so that it is shaped by a real
constraint rather than by speculation about one. If that never happens, it is
never built.

When it is designed, it has to settle: where it lives (`Main.Util.exec`, or its
own namespace); streamed or buffered output, and how a long-running process is
cancelled; timeouts, working directory and environment; and whether a renderer
extension may request it directly.

### Environment and working directory

Under option 2 the extension spawns the process itself, so the host imposes
nothing and — more importantly — **guarantees nothing**. That is the contract,
and it puts two obligations on the author:

- **Pass an explicit `env`.** A child inherits the application's environment by
  default, and that environment is not a documented surface: it carries whatever
  the user's desktop session, the shell-sync feature and the packaging format
  put there, and it differs between a `.dmg`, a Snap and a `pnpm dev`. Do not
  repeat the wholesale `{ ...process.env }` inheritance that
  `fork-pnpm.injectable.ts` does today — pass the variables the tool needs.
- **Pass an explicit `cwd`.** The application's working directory is
  unspecified and platform-dependent — on macOS a bundle launched from Finder
  starts at `/`. Derive one from `manifestPath` or from
  `getExtensionFileFolder()`.

If the curated API of option 3 is ever built, these stop being obligations and
become guarantees the host makes instead. Until then they are the author's.

## How an extension finds its own files

`LensExtension.manifestPath` is how an extension derives its own directory, and
`getExtensionFileFolder()` gives it a writable one keyed by `storeName`.

Under the URL-based loading of #2400 the renderer has **no `__dirname`**, which
makes `manifestPath` the only route. It stops being a convenience and becomes
part of the contract.

This works because **everything is extracted, not only the executables.**
Partial extraction would give one extension's files two access paths, and that
split is where mistakes live. Full extraction also keeps `manifestPath` pointing
at a real directory, so an extension reads its own non-code resources with `fs`
and the renderer's scheme serves them from disk — which removes "how does an
extension reach its own assets" from the contract entirely.

## Executable mode bits, measured

`npm pack` preserves `0755` in the tarball, and `tar@7.5.21` invoked exactly as
`extract-tar.injectable.ts` does (`extract({ file, cwd })`, no mode options)
applies the archive's mode masked by the process umask:

| umask | resulting mode of `bin/tool` |
| --- | --- |
| 022 | 755 |
| 077 | 700 |
| 000 | 755 |

**The owner's execute bit always survives**, which is the only bit that matters
for spawning, and umask can only remove — at `000` the result is `755`, not
`777`, so the archive's mode is a ceiling.

Verified on macOS. Linux uses the same chmod-plus-umask mechanism and should be
confirmed in CI. On Windows the concern does not exist — NTFS has no POSIX mode
bits and executability comes from the file extension — so the real risk to test
there is path length and reserved characters in names.

## Code signing and endpoint protection

The host's own binaries are covered by the application's signature and
notarization. **An extension's are not.**

On macOS a spawned unsigned binary meets Gatekeeper. On Windows, an `.exe`
written into the user data directory and executed is exactly the shape endpoint
protection reacts to — this project already has the precedent in #2376, where
shell sync plus an npm version check was reported as a reverse shell by Defender
for Endpoint.

Shipping executables inside extensions makes that class of report **more**
likely, not less. The contract's expectation of an author is: **sign your
binaries.**

What the host does about unsigned ones — nothing, warn, or refuse — is
deliberately **not** decided here. It is a user-facing policy whose right answer
depends on the store and the trust model around it, neither of which exists yet,
and deciding it now would mean guessing at both. It is bundled with the feature
rather than left as an oversight: whoever implements binary support decides it
then, and that decision belongs in this document.

## Deliberately deferred

Recorded so none of it returns as an oversight:

- **Attestations and provenance** for extensions. The first installer verifies
  transfer integrity only; 13 of the 24 published extensions carry npm
  attestations and 11 do not, so requiring provenance today would exclude nearly
  half the ecosystem. Rationale and numbers in #2400.
- **Store presentation and policy** — what the host does about a suspicious
  declaration, how it is surfaced, and the store itself.
- **An extension substituting a host-managed tool** (`kubectl`, `helm`). Host
  paths win for now. Reopening it needs a *version-aware* rung rather than a
  blanket precedence, because kubectl's correctness depends on matching the
  cluster's minor version — and an explicit per-tool user choice rather than
  automatic substitution, because an extension that can replace the kubectl the
  host runs sees every credential it is given.
- **Roaming versus Local on Windows** for the application data directory —
  #2447.

## Note on install paths

An earlier design pass on this issue recorded the install directory as
`<sanitized-name>/<version>/` with the downloaded `.tgz` kept beside the
extracted tree. **#2400's consolidated design supersedes both:** the path is
`<sanitized-name>/<version>-<digest8>/` and the tarball is discarded after
extraction. Version alone is not a content identity — URL and local installs
have no version discipline, and an author rebuilding `my-ext-0.1.0.tgz`
repeatedly is the dominant case. The digest is an identity and cache-busting
token, not a verification anchor.

## References

- [`docs/v2-extension-api.md`](./v2-extension-api.md) — the API contracts
- [`docs/v2-extension-migration.md`](./v2-extension-migration.md) — the porting guide
- #2401 — this contract's issue
- #2400 — delivery: extraction, install paths, mode bits
- #2399 — a renderer without Node makes host-mediated invocation mandatory
- #2376 — the endpoint-protection precedent
