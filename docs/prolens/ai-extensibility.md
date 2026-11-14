# AI tools, Ask AI and extensibility

ProLens launches AI assistants that run on the user's machine and gives them
Kubernetes context the user chose to share. This document describes the parts
a contributor extends.

## Providers (command-line assistants)

A provider is an `AiToolProvider` registered with
`aiToolProviderInjectionToken` (`packages/core/src/features/ai-tools/common`).
The built-in ones live in `common/providers/`, one injectable each. A provider
declares:

- its display name, vendor, badge text and colour;
- the executable looked up on `PATH` (`defaultExecutable`), and an argument
  template (`defaultArguments`) in which `{prompt}` stands for the prompt as a
  single argument;
- the arguments that print its version, the read-only mode its default
  arguments select (`readOnlyMode`), its documentation URL and install
  commands per platform.

Users override the executable and the argument template per provider in
Preferences → External Tools; those overrides are stored in the
`aiToolSettings` preference. The "Custom command" provider has no default
executable and covers any other CLI.

Detection runs in main (`main/detect-ai-tools.injectable.ts`): it searches
`PATH`, then the directories installers commonly use (`~/.local/bin`,
`/opt/homebrew/bin`, npm and Bun global directories, …), because an
application started from the dock has a shorter `PATH` than a terminal.

## Launching

`launch-ai-tool.injectable.ts` asks main to prepare the launch, which writes
the prompt and a session token to private files (`0600`, in a `0700` directory
under the system temporary directory, removed after an hour), and types a
short command into a new terminal tab of the cluster:

```sh
exec env FREELENS_PROXY_TOKEN="$(cat '/tmp/prolens-ai-user/….token')" '/path/to/claude' '--permission-mode' 'plan' "$(cat '/tmp/prolens-ai-user/….md')"
```

Every part is quoted; the prompt is substituted inside double quotes, which a
POSIX shell does not expand further. On Windows the same is done by a
PowerShell script passed with `-EncodedCommand`. The cluster terminal is
already configured for the cluster, so the assistant's `kubectl` reaches it.

The terminal belongs to a cluster frame. Ask AI from the top bar, which lives
in the root frame, goes through main (`askAiInClusterChannel`) to the frame of
the active cluster.

## Context sources

What a prompt contains besides the question comes from context sources,
registered with `aiContextSourceInjectionToken` (`renderer/context-source.ts`).
Each one is a checkbox in the Ask AI dialog:

| Source     | Default                | Content                                                                              |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `manifest` | on                     | The object's YAML without managed fields; Secret and credential-like values redacted |
| `events`   | on for the events page | The object's events, or warning events for a namespace or the cluster                |
| `logs`     | on for the logs tab    | Recent logs per container, and the previous run's when it crashed                    |

A new source — Prometheus metrics, Argo CD application state, Helm release
history, the answer of an MCP server — implements `AiContextSource` and
registers itself; the dialog lists it for the targets it says it is available
for. Sources that send logs, events or anything else sensitive stay off by
default.

Every section passes through `redactSensitiveText` before it is added to the
prompt. That pass is best effort; structural redaction in the source (as the
manifest source does) comes first.

## Enforcement

ProLens does not rely on instructions to the assistant, or on the
assistant's own permission modes, to keep the cluster safe. Those are layers
on top of the enforcement, which is in ProLens' proxy:

1. **A session token per launch.** `prepare-ai-launch` issues the assistant an
   AI session token for its cluster, written to a private file. The command
   starts the assistant with that token in place of the terminal's own
   (`exec env FREELENS_PROXY_TOKEN="$(cat …)" …`), so every `kubectl` and
   `helm` the assistant runs, directly or through a tool, presents it to the
   ProLens proxy.
2. **The gate.** The proxy hands a request with a session token to
   `ai-session-gate`. A session reaches only the Kubernetes API of its own
   cluster: not other clusters, not ProLens' local API, not shells.
   `classifyKubeRequest` lets reads through — get, list, watch, logs,
   `kubectl auth can-i`, server-side dry runs — and holds everything else:
   create, update, patch, delete (including evictions and deletes of whole
   collections), Secret reads, and `exec`, `attach`, `port-forward` and
   `proxy`.
3. **Approval of one request.** A held request is shown in the main window
   with the assistant, the cluster, what it does and the exact API call. The
   default is Deny. "Allow once" lets that single request through; it is
   denied when nobody answers within two minutes. A denied request gets a
   Kubernetes `Forbidden` status that tells the assistant to ask the user.

`kubectl exec` asks twice when it is denied: it retries over SPDY after its
WebSocket upgrade is refused.

The terminal's own token, used by the user's own commands and by ProLens
itself, is unaffected.

On top of the gate:

- Every prompt starts with `aiSafetyInstructions`.
- Providers start in their most restrictive mode where the CLI has one:
  Claude Code in plan mode, Codex in a read-only sandbox (which also blocks
  network access, so Codex asks before each `kubectl` it runs). Copilot CLI
  and Gemini CLI ask before running commands by default. A CLI's own mode can
  change during a session; the gate does not depend on it.
- The dialog shows the exact prompt before it is sent.

### Limits

The gate covers what reaches the cluster through ProLens. An assistant that
runs commands can also read files the user can read, such as the original
kubeconfig with its credentials, and use them to reach the cluster directly.
ProLens cannot prevent that; the CLI's own sandbox (Codex) or permission
prompts (Claude Code, Copilot CLI, Gemini CLI) are the protection there. On
Linux a process can read the environment of its parent shell through
`/proc`; the assistant is started with `exec`, so the shell holding the
terminal's token is not its parent.

## API backends and MCP servers

`common/ai-tools.ts` declares the interfaces for assistants that are not
command-line tools:

- `AiBackend`, registered with `aiBackendInjectionToken` in main, for Ollama,
  OpenAI-compatible endpoints and external agent platforms. It streams an
  answer for a list of messages.
- `AiBackendConfiguration` refers to its API key through an
  `AiCredentialRef`. The secret stays in main — stored with Electron's
  `safeStorage` — and never reaches the renderer, logs or a prompt.
- `McpServerConfiguration` describes an MCP server (stdio or HTTP) and whether
  it is read-only. Servers that can change state need approval per call.

No backend implements these interfaces yet. An implementation adds the
backend, a preference page to configure it, and a response view in the Ask AI
dialog in place of the terminal launch.
