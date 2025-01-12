# Freelens

<!-- markdownlint-disable MD013 -->

[![GitHub](https://img.shields.io/github/v/release/freelensapp/freelens?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens)
[![Unit tests](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/unit-tests.yaml)
[![Integration tests](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml/badge.svg)](https://github.com/freelensapp/freelens/actions/workflows/integration-tests.yaml)
[![npm](https://img.shields.io/npm/v/@freelensapp/core.svg)](https://www.npmjs.com/package/@freelensapp/core)

<!-- markdownlint-enable MD013 -->

Freelens is a standalone application for MacOS, Windows, and Linux operating
systems.

![Screenshot](.github/screenshot.png)

## Downloads

The official packages have not yet been released. You can track the progress
of the [milestone
0.1.1](https://github.com/freelensapp/freelens/milestone/1).

However, you can download testing packages from the project for nightly
builds: <https://github.com/freelensapp/freelens-nightly-builds/releases>

### MacOS

Download either PKG (installer) or DMG (image) package. Both arm64 (M1 chip
or newer) and amd64 (Intel) variants are available.

### Linux

Download DEB or RPM (package) or AppImage (executable). Both arm64 (aarch64)
and amd64 (x86_64) variants are available.

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

Snap and FatPack packages will be announced later.

### Windows

Download EXE or MSI installers.

The EXE and MSI are not yet signed then you must override Microsoft Defender
SmartScreen to install them.

Only x64 (amd64) version of the Windows binaries are provided.

### Node-Pod-Menu extension

To view container logs and shell into them and nodes you can install the very
useful extension
[freelens-node-pod-menu](https://github.com/freelensapp/freelens)

## Development

The primary aim is currently to maintain the current open source code with
its functionality and fix bugs.

### Prerequisites

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
