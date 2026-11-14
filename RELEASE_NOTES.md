# ProLens v1.0.0

The first release of ProLens, a Kubernetes IDE for macOS, Windows and Linux
based on [Freelens](https://github.com/freelensapp/freelens). ProLens installs
next to Freelens and keeps its own settings, so both can be used on the same
machine.

## Highlights

### AI assistants in the cluster terminal

- Ask AI starts a command-line assistant in the terminal of a cluster, with a
  prompt that describes the cluster, or the resource it was opened from.
  Claude Code, OpenAI Codex CLI, Gemini CLI, GitHub Copilot CLI and OpenCode
  are detected automatically, and any other tool can be set up as a custom
  command.
- ProLens checks the cluster requests of an assistant itself, not only through
  instructions in the prompt. Reads pass. Changes to the cluster, `exec`,
  `attach`, port forwarding and reading Secrets wait until you allow that exact
  request in a dialog; unanswered requests are denied after two minutes.
- Context sent to an assistant never includes the values of Secrets.

### Themes

- New themes: ProLens Dark, ProLens Light, Aurora, Graphite, High Contrast,
  Midnight and Nord, next to the classic light and dark themes.
- An accent color, a compact density and the font size can be set in
  Preferences, and custom themes can be added.

### ProLens identity

- New name, icons and application id `app.prolens.ProLens`.
- `prolens://` links; `freelens://` links keep opening Freelens.
- The update check and "What's new" use the releases of
  [chago1991/prolens](https://github.com/chago1991/prolens/releases).
- Extensions written for Freelens work in ProLens.

## Downloads

| Platform             | Files                                                            |
| -------------------- | ---------------------------------------------------------------- |
| macOS, Apple silicon | `ProLens-1.0.0-macos-arm64.dmg`, `ProLens-1.0.0-macos-arm64.zip` |
| macOS, Intel         | `ProLens-1.0.0-macos-x64.dmg`, `ProLens-1.0.0-macos-x64.zip`     |
| Windows, x64         | `ProLens-1.0.0-windows-x64.exe` (installer)                      |
| Windows, ARM64       | `ProLens-1.0.0-windows-arm64.exe` (installer)                    |
| Linux, x86_64        | `ProLens-1.0.0-linux-x64.AppImage`, `.deb`, `.rpm`               |
| Linux, ARM64         | `ProLens-1.0.0-linux-arm64.AppImage`, `.deb`, `.rpm`             |

`ProLens-1.0.0-SHA256SUMS.txt` lists the SHA-256 of every file.

## Installing

ProLens does not update itself. It tells you when a newer release is
available; download and install it from the releases page.

When a file is not code-signed (see "Signing" below), the operating system
warns before the first start:

- **macOS:** open the app once, then choose **Open Anyway** in System Settings
  → Privacy & Security.
- **Windows:** in the SmartScreen dialog, choose **More info**, then
  **Run anyway**.
- **Linux:** packages are not signed; compare their checksums with
  `ProLens-1.0.0-SHA256SUMS.txt`.

## Requirements

- macOS 13 or later.
- Windows 10 or later.
- Linux with glibc 2.34 or later (Debian 12, Fedora 35, Ubuntu 22.04 or newer).
- Kubernetes 1.22 or later.

## Credits

ProLens is built on the work of the Freelens Authors and the OpenLens Authors,
and keeps their MIT license and copyright notices.
