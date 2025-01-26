# Freelens development

You can build the application using this repository or download the [nightly
builds](https://github.com/freelensapp/freelens-nightly-builds/releases) of
the current main branch.

## Build from the source

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

## Additional components

This application uses additional components hosted in separate repositories:

* [freelens-k8s-proxy](https://github.com/freelensapp/freelens-k8s-proxy/)
* [freelens-node-pod-menu](https://github.com/freelensapp/freelens-node-pod-menu/)

It bundles binaries for:

* helm
* kubectl

The [Renovate](https://github.com/freelensapp/freelens/issues/64) bot keeps
the version up-to-date.

The [Automated kubectl versions](.github/workflows/kubectl-versions.yaml)
workflow updates the list of the latest kubectl patch versions for reach
minor version.

## Distribution

Additional repositories for distribution of the packages:

* [Flathub](https://github.com/flathub/app.freelens.Freelens)
* [Homebrew](https://github.com/freelensapp/homebrew-tap)
* [Snapcraft](https://github.com/freelensapp/freelens-snap)
* [WinGet](https://github.com/freelensapp/freelens-winget)

## Releasing

The [Automated npm version](.github/workflows/npm-version.yaml) workflow
prepares a new PR for the semver incrementing. After PR is merged,
[Release](.github/workflows/release.yaml) workflow makes a new release:

1. Prepares a new draft release.
2. Builds and notarizes binary for each OS and architecture supported.
3. Finalizes a new release.
4. Publishes NPM packages.
5. Adds the indexes for APT repository.
