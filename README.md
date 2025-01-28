# Freelens

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![GitHub](https://img.shields.io/github/stars/freelensapp/freelens?style=flat&label=GitHub%20%E2%AD%90)](https://github.com/freelensapp/freelens)
[![license](https://img.shields.io/github/license/freelensapp/freelens.svg)](https://github.com/freelensapp/freelens?tab=MIT-1-ov-file#readme)
[![release](https://img.shields.io/github/v/release/freelensapp/freelens?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens/releases/latest)
[![Unit tests](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml)
[![Integration tests](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml)

<!-- markdownlint-enable MD013 -->

[Freelens](https://freelens.app) is a free and open-source user interface
designed for managing Kubernetes clusters. It provides a standalone
application compatible with macOS, Windows, and Linux operating systems,
making it accessible to a wide range of users. The application aims to
simplify the complexities of Kubernetes management by offering an intuitive
and user-friendly interface.

![Screenshot](freelens/build/screenshots/main.png)

## Downloads

See the [releases](https://github.com/freelensapp/freelens/releases) page and
download the right package for your system.

### macOS

Download either the PKG (installer) or DMG (image) package from the
[releases](https://github.com/freelensapp/freelens/releases) page. Both arm64
(M1 chip or newer) and amd64 (Intel) variants are available.

All binary packages are built on macOS 14 and should be compatible with newer
systems.

#### Homebrew

Run the following command:

```sh
brew tap freelensapp/tap
brew install --cask freelens
```

### Linux

Download DEB or RPM (package) or AppImage (executable) from the
[releases](https://github.com/freelensapp/freelens/releases) page. Both arm64
(aarch64) and amd64 (x86_64) variants are available.

All binary packages are built on Ubuntu 20.04 and should be compatible with
new systems.

#### AppImage

The Linux AppImage file requires libz.so and libfuse.so.2. You can add them
by running:

```sh
sudo ln -fs /usr/lib/*/libz.so.1 /usr/local/lib/libz.so
sudo ldconfig
sudo apt install libfuse2
```

Run the application with additional arguments:

```sh
./Freelens*.AppImage --no-sandbox --ozone-platform-hint=auto
```

#### Flatpak

The package is available on the
[Flathub](https://flathub.org/apps/app.freelens.Freelens) App Store for
Linux.

Run the following commands:

```sh
flatpak install flathub app.freelens.Freelens
flatpak run app.freelens.Freelens
```

The application is sandboxed. It includes bundled `kubectl` and `helm`
commands and uses the `~/.kube/config` file by default. The `~/.freelens`
directory is stored in the sandbox.

Flatpak adds wrappers for the `aws`, `gke-gcloud-auth-plugin`, and
`kubelogin` tools, running them as commands from the host system.

The terminal uses `/bin/sh` by default, but it can be switched in the
settings to, for example, `/bin/bash` for a sandboxed environment or
`/app/bin/host-spawn` for a host environment.

#### APT repository

Run the following commands:

<!-- markdownlint-disable MD013 -->

```sh
curl -L https://raw.githubusercontent.com/freelensapp/freelens/refs/heads/main/freelens/build/apt/freelens.asc | sudo tee /etc/apt/keyrings/freelens.asc
curl -L https://raw.githubusercontent.com/freelensapp/freelens/refs/heads/main/freelens/build/apt/freelens.sources | sudo tee /etc/apt/sources.list.d/freelens.sources
sudo apt update
sudo apt install freelens
```

<!-- markdownlint-enable MD013 -->

### Windows

Download the EXE or MSI installers from the
[releases](https://github.com/freelensapp/freelens/releases) page.

The EXE and MSI are not yet signed, so you must override Microsoft Defender
SmartScreen to install them.

Only the x64 (amd64) version of the Windows binaries is provided.

#### WinGet

The package is available in
[WinGet](https://winstall.app/apps/Freelensapp.Freelens) Community
[repository](https://github.com/microsoft/winget-pkgs).

Run the following command:

```powershell
winget install Freelensapp.Freelens
```

The `--silent` option is supported to suppress all UI.

### Node-Pod-Menu extension

To view container logs and shell into them and nodes, you can install the
[freelens-node-pod-menu](https://github.com/freelensapp/freelens-node-pod-menu)
extension.

To install it, open the `Freelens` -> `Extensions` menu, enter the name
`@freelensapp/freelens-node-pod-menu` as input, and click the `Install`
button.

## Development

Read [DEVELOPMENT.md](DEVELOPMENT.md) to see how to build the application
from source.

## Contributing

Anyone is welcome to collaborate to advance the Freelens project. Read
[CONTRIBUTING.md](CONTRIBUTING.md) to see how you can help.

![Star History Chart](https://api.star-history.com/svg?repos=freelensapp/freelens&type=Date)

## License

This repository is a fork of [Open
Lens](https://github.com/lensapp/lens/tree/master), the core of [Lens
Desktop](https://k8slens.dev), with the aim of carrying forward its
open-source version.

Copyright (c) 2024-2025 Freelens Authors.

Copyright (c) 2022 OpenLens Authors.

[MIT License](https://opensource.org/licenses/MIT)
