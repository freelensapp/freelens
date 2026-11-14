# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, pull
requests or discussions.

Report a vulnerability in ProLens privately through GitHub: open the
[Security tab](https://github.com/chago1991/prolens/security) of this
repository and choose **Report a vulnerability**. Only you and the maintainer
can see the report. If that button is not offered, open an issue that asks for
a private contact, without any detail of the vulnerability.

A vulnerability that is also in Freelens, because it is in code ProLens shares
with it, should be reported to Freelens as well, as its
[security policy](https://github.com/freelensapp/freelens/security/policy)
describes.

Please include:

- the ProLens version, your operating system and the file you installed,
- what an attacker can do, and what they need first: a malicious cluster or
  kubeconfig, a crafted extension, a link that opens ProLens, an AI assistant
  started from ProLens, network access,
- steps to reproduce, or a proof of concept,
- anything you know about a fix or a workaround.

## What happens next

ProLens is maintained by volunteers, so there is no guaranteed response
time, but every report is read. We confirm that we have received it, keep you
updated in the advisory while we work on a fix, and agree with you when to disclose it. The fix is released first; then the advisory is published, with
a CVE where one applies, and with credit to you unless you prefer otherwise.

## Supported versions

Security fixes go into the next release. Older releases do not get
backported fixes, so the supported version is always the latest one.

## Scope

In scope is everything this repository builds and ships:

- the ProLens application, its main and renderer processes and the local
  proxy between ProLens and your clusters, including the approval of the
  cluster requests of AI assistants,
- the extension host: how extensions are installed, verified and loaded, and
  what the extension API exposes,
- how ProLens obtains the `kubectl`, `helm` and `freelens-k8s-proxy`
  binaries it bundles or downloads, and how it verifies them,
- `freelens-k8s-proxy`, which Freelens develops in
  [its own repository](https://github.com/freelensapp/freelens-k8s-proxy);
  report a vulnerability in it to Freelens,
- the build and release pipeline of this repository.

Report these elsewhere:

- vulnerabilities in `kubectl`, `helm` or Kubernetes itself, to the
  [Kubernetes](https://kubernetes.io/docs/reference/issues-security/security/)
  and [Helm](https://github.com/helm/community/blob/main/SECURITY.md) security
  teams,
- vulnerabilities in an extension, to its author,
- problems in a package that someone else maintains (a Homebrew cask, a
  Flatpak, an AUR package, …), to that package's maintainers, unless the
  problem is in ProLens itself.

Not vulnerabilities in ProLens:

- an installed extension doing something harmful: extensions run with the
  privileges of ProLens itself, so install only extensions you trust,
- anything a kubeconfig already allows: ProLens acts on a cluster with the
  credentials you give it,
- attacks that need control of your user account or of the machine ProLens
  runs on.
