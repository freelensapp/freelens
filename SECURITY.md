# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, pull
requests or discussions.

Report them privately through GitHub instead: open the
[Security tab](https://github.com/freelensapp/freelens/security) of this
repository and choose **Report a vulnerability**, or go straight to
[the reporting form](https://github.com/freelensapp/freelens/security/advisories/new).
Only you and the maintainers can see the report.

Please include:

- the Freelens version, your operating system and how you installed Freelens
  (an installer from the releases page, Homebrew, Flatpak, Snap, WinGet, …),
- what an attacker can do, and what they need first: a malicious cluster or
  kubeconfig, a crafted extension, a link that opens Freelens, network access,
- steps to reproduce, or a proof of concept,
- anything you know about a fix or a workaround.

## What happens next

Freelens is maintained by volunteers, so there is no guaranteed response
time, but every report is read. We confirm that we have received it, keep you
updated in the advisory while we work on a fix, and agree with you when to
disclose it. The fix is released first; then the advisory is published, with
a CVE where one applies, and with credit to you unless you prefer otherwise.

## Supported versions

Security fixes go into the next release. Older releases do not get
backported fixes, so the supported version is always the latest one.

## Known vulnerabilities in dependencies

Both the latest release and the `main` branch are scanned automatically for
known vulnerabilities in what the packaged application contains: its Node
dependencies and the bundled `kubectl` and `helm` binaries. The reports are
published, and kept up to date, in the
[Security scans](https://github.com/freelensapp/freelens/discussions/categories/security-scans)
discussion category: one discussion for the latest release, refreshed every
night and after each release, and one for `main`, refreshed with its builds.

What the scans read is public too, so you can check a build yourself:

- every release carries, as release assets, an SBOM for each platform
  (`Freelens-<version>-<os>-<arch>-sbom.*`) and the list of the Node packages
  that reach the application (`Freelens-<version>-prod-packages.json`),
- every build of `main` publishes an SBOM and the package list for each
  platform its integration tests run on, as artifacts of that run.

An advisory listed in a report is already known, so there is no need to
report it privately. Report it privately if you find that Freelens makes it
exploitable, for example that a vulnerable code path is reachable through
something Freelens does, since that is not public yet.

## Scope

In scope is everything this repository builds and ships:

- the Freelens application, its main and renderer processes and the local
  proxy between Freelens and your clusters,
- the extension host: how extensions are installed, verified and loaded, and
  what the extension API exposes,
- how Freelens obtains the `kubectl`, `helm` and `freelens-k8s-proxy`
  binaries it bundles or downloads, and how it verifies them,
- `freelens-k8s-proxy` itself, which is developed in
  [its own repository](https://github.com/freelensapp/freelens-k8s-proxy)
  but reported here,
- the build and release pipeline of this repository.

Report these elsewhere:

- vulnerabilities in `kubectl`, `helm` or Kubernetes itself, to the
  [Kubernetes](https://kubernetes.io/docs/reference/issues-security/security/)
  and [Helm](https://github.com/helm/community/blob/main/SECURITY.md) security
  teams,
- vulnerabilities in an extension, to its author,
- problems in a package that someone else maintains (a Homebrew cask, a
  Flatpak, an AUR package, …), to that package's maintainers, unless the
  problem is in Freelens itself.

Not vulnerabilities in Freelens:

- an installed extension doing something harmful: extensions run with the
  privileges of Freelens itself, so install only extensions you trust,
- anything a kubeconfig already allows: Freelens acts on a cluster with the
  credentials you give it,
- attacks that need control of your user account or of the machine Freelens
  runs on.
