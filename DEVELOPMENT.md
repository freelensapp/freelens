# Freelens development

## Build from the source

You can build the application using this repository.

### Prerequisites

The only native module Freelens uses is
[node-pty](https://www.npmjs.com/package/node-pty), which ships prebuilt,
ABI-stable (N-API) binaries for every platform we support. There is therefore
no need for a C/C++ compiler, Python, or Visual Studio build tools to build or
run the app.

On Linux you still need the shared libraries Electron requires at runtime, for
example:

```sh
# Debian/Ubuntu
apt install libnss3
```

Use [NVM](https://github.com/nvm-sh/nvm) or
[mise-en-place](https://mise.jdx.dev/) or
[windows-nvm](https://github.com/coreybutler/nvm-windows) to install the
required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise settings add idiomatic_version_file_enable_tools node
mise install
# or
winget install CoreyButler.NVMforWindows
nvm install 24.18.0
nvm use 24.18.0
```

Install Pnpm (if is not yet installed with mise-en-place):

```sh
corepack enable pnpm
# or
mise exec -- corepack enable pnpm
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

The official binary packages are built in a native environment, however you can
build an arm64 binary on Linux amd64 or an amd64 binary on macOS arm64.

Because node-pty ships prebuilt binaries for every architecture, no native
recompilation is required — you only need electron-builder to download Electron
for the foreign architecture:

```sh
export DOWNLOAD_ALL_ARCHITECTURES=true
```

Then generate the binary packages for the foreign architecture:

```sh
# Debian/Ubuntu
pnpm build:app AppImage deb --arm64
# MacOS
pnpm build:app dmg pkg --x64
```

## Development Workflow

### Validation before commit

After changing files, especially before commit, run:

```sh
trunk check
# or, if trunk is not installed locally
pnpm trunk:check
```

For main project TypeScript and HTML files, you can run Biome directly:

```sh
biome check
# or, if biome is not installed locally
pnpm biome:check
```

For other file types, use Trunk:

```sh
trunk check
# or, if trunk is not installed locally
pnpm trunk:check
```

### Daily development

For active development with hot module replacement:

```sh
pnpm dev         # Starts the app through electron-vite dev
```

The renderer is served by the Vite dev server (port 9191, overridable with
`FREELENS_DEV_SERVER_PORT`) through the lens proxy; the main process is
rebuilt on change. If dev mode misbehaves, the packaged-app workflow
`pnpm build && pnpm build:app:dir && pnpm start` always works.

### Inspecting the running dev app from an AI agent (optional)

The `pnpm dev` script launches Electron with `--remoteDebuggingPort 9223`, so
the running app exposes a Chrome DevTools Protocol (CDP) endpoint. An AI coding
agent (Claude Code, Cursor, …) can attach to it to drive and inspect the app —
snapshot the accessibility tree, click, read the DOM, capture screenshots —
which is useful for debugging renderer-side issues that never reach the terminal.

Use a **frame-aware** CDP client. Freelens renders each cluster in a
cross-origin `<clusterId>.renderer.freelens.app` iframe, so a tool that only
sees the top document (e.g. `@laststance/electron-mcp-server`) can drive the
catalog/welcome shell but is blind to everything inside a cluster (Nodes,
Workloads, Pods, …). Playwright and Puppeteer traverse cross-origin frames and
reach the cluster views, so prefer one of them:

- [Playwright MCP](https://github.com/microsoft/playwright-mcp) — `@playwright/mcp`, connect with `--cdp-endpoint`
- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) — connect with `--browser-url`

This is a per-developer, opt-in tool and is intentionally **not** committed to
`.mcp.json` (that would prompt every contributor). Add it to your own local
Claude Code config, pointed at the dev CDP port:

```sh
# Local scope: stored per-project in ~/.claude.json, not shared
claude mcp add playwright --scope local -- npx -y @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:9223
```

Then:

1. Start the app with `pnpm dev` (it must be running before the agent connects).
2. In Claude Code, run `/mcp` to confirm the `playwright` server is connected.
3. Ask the agent to drive the app; to reach a cluster's resources it targets the
   `…renderer.freelens.app/…` cluster frame, not just the top page.

Remove it any time with `claude mcp remove playwright --scope local`. Some MCP
servers write runtime artifacts (screenshots, databases, keys) under `logs/` in
the project root, which is git-ignored.

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
