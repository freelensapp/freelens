# Freelens development

## Nightly builds

You can download the [nightly
builds](https://github.com/freelensapp/freelens-nightly-builds/releases) of
the current main branch.

## Build from the source

You can build the application using this repository.

### Prerequisites

Install a compiler and Python setuptools, for example:

```sh
# Debian/Ubuntu
apt install build-essential python3-setuptools
# MacOS
brew install bash python3-setuptools
# Windows
winget install Microsoft.VisualStudio.2022.Community Python.Python.3.13
& 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe'
# then install required components
```

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) or
[windows-nvm](https://github.com/coreybutler/nvm-windows) to install the
required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise install
# or
winget install CoreyButler.NVMforWindows
nvm install 22.14.0
nvm use 22.14.0
```

Install Pnpm:

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
# or
winget install pnpm.pnpm
```

### Build app

```sh
pnpm i
pnpm build
pnpm build:app
# on Windows it must be ran in elevated mode
```

Run it from the directory:

```sh
pnpm start
```

### Cross compilation

You can build arm64 binary on Linux amd64 or amd64 binary on MacOS arm64.

On Linux, install cross-compiler (macOS includes this by default):

```sh
# Debian/Ubuntu
apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
```

Then set the environment with support for other architectures:

```sh
# Debian/Ubuntu
export CC=aarch64-linux-gnu-gcc CXX=aarch64-linux-gnu-g++
export DOWNLOAD_ALL_ARCHITECTURES=true
# MacOS
export DOWNLOAD_ALL_ARCHITECTURES=true
```

And rebuild binary packages for the foreign architecture:

```sh
# Debian/Ubuntu
pnpm electron-rebuild -a arm64
# MacOS
pnpm electron-rebuild -a x64
```

Finally, generate binary packages:

```sh
# Debian/Ubuntu
pnpm build:app AppImage deb --arm64
# MacOS
pnpm build:app dmg pkg --x64
```

### Run app

To run the app in developer mode:

```sh
pnpm dev
```

## Additional components

This application uses additional components hosted in separate repositories:

* [freelens-k8s-proxy](https://github.com/freelensapp/freelens-k8s-proxy/)

It bundles binaries for:

* [helm](https://helm.sh/)
* [kubectl](https://kubernetes.io/docs/reference/kubectl/)

The [Renovate](https://github.com/freelensapp/freelens/issues/64) bot keeps
the versions up-to-date.

The [Automated kubectl versions](.github/workflows/kubectl-versions.yaml)
workflow updates the list of the latest kubectl patch versions for each minor
version.

## Distribution

Additional repositories for distributing packages:

* [Flathub](https://github.com/flathub/app.freelens.Freelens)
* [Homebrew](https://github.com/freelensapp/homebrew-tap)
* [Snapcraft](https://github.com/freelensapp/freelens-snap)
* [WinGet](https://github.com/freelensapp/freelens-winget)

## Releasing

The [Automated npm version](.github/workflows/npm-version.yaml) workflow
prepares a new PR for semantic versioning. After the PR is merged, the
[Release](.github/workflows/release.yaml) workflow handles the release
process:

1. Prepares a new draft release.
2. Builds and notarizes binaries for each supported OS and architecture.
3. Finalizes the new release.
4. Publishes NPM packages.
5. Adds the indexes for APT repository.
