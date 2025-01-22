# Freelens

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![license](https://img.shields.io/github/license/freelensapp/freelens.svg)](https://github.com/freelensapp/freelens?tab=MIT-1-ov-file#readme)
[![release](https://img.shields.io/github/v/release/freelensapp/freelens?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens)
[![npm](https://img.shields.io/npm/v/@freelensapp/core.svg)](https://www.npmjs.com/package/@freelensapp/core)
[![Unit tests](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml)
[![Integration tests](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml)

<!-- markdownlint-enable MD013 -->

[Freelens](https://freelens.app) is a standalone application for MacOS,
Windows, and Linux operating systems.

![Screenshot](.github/screenshot.png)

## Downloads

See the [releases](https://github.com/freelensapp/freelens/releases) page and
download the right package for your system.

### MacOS

Download either PKG (installer) or DMG (image) package. Both arm64 (M1 chip
or newer) and amd64 (Intel) variants are available.

All binary packages are built on MacOS 14 and should be compatible with new
systems.

### Linux

Download DEB or RPM (package) or AppImage (executable). Both arm64 (aarch64)
and amd64 (x86_64) variants are available.

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

Debian 12 or Ubuntu 24.04 or newer:

<!-- markdownlint-disable MD013 -->
```sh
curl -L https://github.com/freelensapp/freelens/raw/refs/heads/main/apt/freelens.sources | sudo tee /etc/apt/sources.list.d/freelens.sources
```
<!-- markdownlint-enable MD013 -->

Older:

<!-- markdownlint-disable MD013 -->
```sh
mkdir -p /etc/apt/keyrings
curl -L https://github.com/freelensapp/freelens/raw/refs/heads/main/apt/freelens.asc | sudo tee /etc/apt/keyrings/freelens.asc
curl -L https://github.com/freelensapp/freelens/raw/refs/heads/main/apt/freelens.list | sudo tee /etc/apt/sources.list.d/freelens.list
```
<!-- markdownlint-enable MD013 -->

Then:

```sh
sudo apt update
sudo apt install freelens
```

### Windows

Download EXE or MSI installers.

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

You can build the application using this repository or download the [nightly
builds](https://github.com/freelensapp/freelens-nightly-builds/releases) from
the separate reposity.

### Prerequisites

Install a compiler, ie.

```sh
# Debian/Ubuntu
apt install build-essential python3-setuptools
# MacOS
brew install bash python3-setuptools
```

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) to install the required Node.js
version.

From the root of this repository:

```sh
nvm install
# or
mise install
```

### Build app

```sh
npm ci
npm run build
npm run build:app
```

At this point, for example on Windows, simply go to the
"freelens\freelens\dist\win-unpacked" directory and run `Freelens.exe`.

### Cross compilation

You can build arm64 binary on Linux amd64 or amd64 binary on MacOS arm64.

On Linux install cross-compiler (MacOS has it already):

```sh
# Debian/Ubuntu
apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
```

then rebuild binary modules and build with download for all architectures:

```sh
# Debian/Ubuntu
env CC=aarch64-linux-gnu-gcc CXX=aarch64-linux-gnu-g++ npm run rebuild -- -- -a arm64
env DOWNLOAD_ALL_ARCHITECTURES=true npm run build
# MacOS
npm run rebuild -- -- -a arm64
env DOWNLOAD_ALL_ARCHITECTURES=true npm run build
```

and generate binary packages:

```sh
# Debian/Ubuntu
npm run build:app -- -- -- AppImage deb --publish never --arm64
# MacOS
npm run build:app -- -- -- dmg pkg --publish never --x86
```

### Run app

To run the app in developer's mode:

```sh
npm run start-dev
```

## Contributing

Anyone is welcome to collaborate to advance the Freelens project.

## License

This repository is a fork of [Open
Lens](https://github.com/freelensapp/freelens/tree/master), core of [Lens
Desktop](https://k8slens.dev), with the aim of carrying forward its open
source version.

Copyright (c) 2024-2025 Freelens Authors.

Copyright (c) 2022 OpenLens Authors.

[MIT License](https://opensource.org/licenses/MIT)
