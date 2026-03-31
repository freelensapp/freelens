# Freelens development

## Build from the source

You can build the application using this repository.

### Prerequisites

Install a compiler and Python setuptools, for example:

```sh
# Debian/Ubuntu
apt install build-essential python3-setuptools libnss3
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
nvm install 22.22.0
nvm use 22.22.0
```

Install Pnpm:

```sh
corepack install
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
# or
winget install pnpm.pnpm
```

### Build app

```sh
pnpm i
pnpm build:di           # Generate DI registration files
pnpm build              # Build all packages
pnpm build:app:dir      # Build Electron app directory
# note: on Windows build:app:dir must be ran in elevated mode
```

Run it from the directory:

```sh
pnpm start
```

### Clean build

If you encounter build or runtime issues, try a clean rebuild:

```sh
rm -rf .turbo packages/core/dist freelens/dist
pnpm build:di
pnpm build
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

## Development Workflow

### Daily development

For active development with automatic rebuilds:

```sh
pnpm dev         # Starts the app with file watching
```

**Note:** `pnpm dev` is not recommended as it doesn't work correctly with
webpack. You can use standard workflow
`pnpm build && pnpm build:app:dir && pnpm start` instead.

### Running tests

```sh
pnpm test:unit              # Run unit tests
pnpm test:integration       # Run integration tests
```

### When to regenerate DI files

The project uses an explicit dependency injection registration system. Run `pnpm build:di` when:

- Adding new `.injectable.ts` files
- Moving or renaming injectable files
- Changing directory structure
- Seeing DI-related runtime errors

The build process runs this automatically, but you can run it manually to verify changes:

```sh
pnpm build:di
```

### Troubleshooting

**Changes not appearing:**

1. Clear cache: `rm -rf .turbo packages/core/dist freelens/dist`
2. Full rebuild: `pnpm build && pnpm build:app:dir`
3. Restart app: `pnpm start`

**Build failures:**

1. Check build errors: `pnpm build`
2. Check linting: `pnpm lint`
3. Verify dependencies: `pnpm install`
4. Check Node.js version matches `.nvmrc`

**Runtime errors:**

- Check dev console (renderer process) or terminal output (main process)
- For DI-related errors, try regenerating: `pnpm build:di`

For more development patterns and troubleshooting, see [AGENTS.md](AGENTS.md).
