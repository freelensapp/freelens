# Freelens

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![license](https://img.shields.io/github/license/freelensapp/freelens.svg)](https://github.com/freelensapp/freelens?tab=MIT-1-ov-file#readme)
[![release](https://img.shields.io/github/v/release/freelensapp/freelens?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens)
[![Unit tests](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml)
[![Integration tests](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml)

<!-- markdownlint-enable MD013 -->

[Freelens](https://freelens.app) is a free and open-source user interface
designed for managing Kubernetes clusters. It provides a standalone
application that is compatible with MacOS, Windows, and Linux operating
systems, making it accessible to a wide range of users. The application aims
to simplify the complexities of Kubernetes management by offering an
intuitive and user-friendly interface.

![Screenshot](freelens/build/screenshots/main.png)

## Downloads

See the [releases](https://github.com/freelensapp/freelens/releases) page and
download the right package for your system.

### MacOS

Download either PKG (installer) or DMG (image) package from the
[releases](https://github.com/freelensapp/freelens/releases) page. Both
arm64 (M1 chip or newer) and amd64 (Intel) variants are available.

All binary packages are built on MacOS 14 and should be compatible with new
systems.

#### Homebrew

Run from the command line:

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

Linux AppImage file requires `libz.so` and `libfuse.so.2`. You can add them,
ie. by running:

```sh
sudo ln -fs /usr/lib/*/libz.so.1 /usr/local/lib/libz.so
sudo ldconfig
sudo apt install libfuse2
```

Run the application with additional arguments:

```sh
./Freelens*.AppImage --no-sandbox --ozone-platform-hint=auto
```

#### APT repository

Run from the command line:

<!-- markdownlint-disable MD013 -->

```sh
sudo mkdir -p /etc/apt/keyrings
curl -L https://raw.githubusercontent.com/freelensapp/freelens/refs/heads/main/freelens/build/apt/freelens.asc | sudo tee /etc/apt/keyrings/freelens.asc
curl -L https://raw.githubusercontent.com/freelensapp/freelens/refs/heads/main/freelens/build/apt/freelens.sources | sudo tee /etc/apt/sources.list.d/freelens.sources
sudo apt update
sudo apt install freelens
```

<!-- markdownlint-enable MD013 -->

### Windows

Download EXE or MSI installers from the
[releases](https://github.com/freelensapp/freelens/releases) page.

The EXE and MSI are not yet signed then you must override Microsoft Defender
SmartScreen to install them.

Only x64 (amd64) version of the Windows binaries are provided.

#### WinGet

Run from the command line:

```powershell
winget install Freelensapp.Freelens
```

It supports `--silent` option for suppressing all UI.

### Node-Pod-Menu extension

To view container logs and shell into them and nodes you can install the very
useful extension
[freelens-node-pod-menu](https://github.com/freelensapp/freelens).

To install it, open `Freelens` -> `Extensions` menu, then put
`@freelensapp/freelens-node-pod-menu` name as an input and push the `Install`
button.

## Development

Read [DEVELOPMENT.md](DEVELOPMENT.md) to see how to build the application
from the source.

## Contributing

Anyone is welcome to collaborate to advance the Freelens project.

## License

This repository is a fork of [Open
Lens](https://github.com/lensapp/lens/tree/master), core of [Lens
Desktop](https://k8slens.dev), with the aim of carrying forward its open
source version.

Copyright (c) 2024-2025 Freelens Authors.

Copyright (c) 2022 OpenLens Authors.

[MIT License](https://opensource.org/licenses/MIT)
