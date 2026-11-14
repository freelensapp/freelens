# Changelog

All notable changes to ProLens are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and ProLens uses
[semantic versioning](https://semver.org/) for the application version.

The version of the extension API is separate from the application version: it
follows Freelens, so that extensions written for Freelens keep working (see
`docs/prolens/releasing.md`).

## [1.0.0] - 2026-11-14

First release of ProLens, forked from Freelens at commit `2547f555`.

### Added

- Ask AI: starts a command-line AI assistant (Claude Code, OpenAI Codex CLI,
  Gemini CLI, GitHub Copilot CLI, OpenCode or a custom command) in the
  terminal of a cluster, with a prompt that describes the cluster or the
  selected resource. Available from the top bar, the cluster overview and the
  menu of a resource.
- Approval of AI requests: every launch gets its own token for the cluster's
  proxy. Reads pass; changes, `exec`, `attach`, port forwarding, proxying and
  Secret reads wait for the user's approval of that exact request, and are
  denied after two minutes without an answer.
- Preferences for the AI tools: detection of installed tools, path and
  arguments per tool.
- Theme engine with semantic design tokens and the themes ProLens Dark,
  ProLens Light, Aurora, Graphite, High Contrast, Midnight and Nord; accent
  color, density and font size preferences; custom themes.
- Multi-platform release workflow (`.github/workflows/prolens-release.yml`)
  that builds macOS (arm64, x64), Windows (x64, arm64) and Linux (x64, arm64)
  installers with checksums and build provenance, and creates draft releases.

### Changed

- Name, icons, installer artwork and application id (`app.prolens.ProLens`)
  of ProLens; its settings live in their own `ProLens` directory, so ProLens
  and Freelens can be installed side by side.
- ProLens registers the `prolens://` scheme. `freelens://` links passed to
  ProLens still work, but stay registered to Freelens.
- The update check and "What's new" read the releases of
  `chago1991/prolens`.

### Removed

- The Freelens APT repository configuration and its publishing workflow.
- The Freelens release workflow, replaced by the ProLens one.

[1.0.0]: https://github.com/chago1991/prolens/releases/tag/v1.0.0
