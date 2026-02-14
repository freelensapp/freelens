<!--
Sync Impact Report
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial)
  Added sections: Core Principles (5), Technology Constraints, Development Workflow, Governance
  Removed sections: N/A
  Templates requiring updates:
    - plan-template.md: ✅ compatible (Constitution Check section is generic)
    - spec-template.md: ✅ compatible (no constitution-specific references)
    - tasks-template.md: ✅ compatible (no constitution-specific references)
    - checklist-template.md: ✅ compatible (no constitution-specific references)
    - agent-file-template.md: ✅ compatible (no constitution-specific references)
  Follow-up TODOs: None
-->

# Freelens Constitution

## Core Principles

### I. DI-First Architecture

All features and cross-cutting concerns MUST use the `@ogre-tools/injectable`
dependency injection system. Direct imports between feature modules are
prohibited; dependencies MUST be declared as injectables and resolved through
the DI container. Registration files MUST be regenerated (`pnpm build:di`)
whenever injectables are added, moved, or renamed.

**Rationale**: Explicit dependency graphs enable testability, extension
isolation, and deterministic initialization order across Electron's
multi-process architecture.

### II. Process Isolation

Main process (`src/main/`), renderer process (`src/renderer/`), and shared
code (`src/common/`, `common/`) MUST remain strictly separated. Renderer code
MUST NOT import main-process modules and vice versa. All cross-process
communication MUST use IPC channels. Process-specific registration files
(`register-injectables-main.ts`, `register-injectables-renderer.ts`) MUST NOT
reference code from the other process.

**Rationale**: Electron enforces process boundaries at runtime. Violating them
causes silent failures or security vulnerabilities. Compile-time separation
prevents these defects.

### III. Extension Compatibility

Changes to `@freelensapp/core` public APIs MUST NOT break existing extensions
without a major version bump and documented migration path. Extension-facing
interfaces MUST be treated as public contracts. Deprecations MUST include a
minimum one-minor-version grace period with console warnings before removal.

**Rationale**: The extension ecosystem is a core value proposition. Breaking
extensions without notice erodes community trust and adoption.

### IV. Test Coverage

Non-trivial changes MUST include unit tests. Integration tests are REQUIRED for
cross-process behavior, IPC contracts, and DI registration correctness.
Tests MUST be co-located with the code they exercise or placed in the
corresponding `tests/` directory. Test commands: `pnpm test:unit`,
`pnpm test:integration`.

**Rationale**: The DI system and multi-process architecture create failure modes
that are invisible without automated verification.

### V. Simplicity and Existing Patterns

New code MUST follow conventions already established in the codebase. Before
introducing a new pattern, contributors MUST search for existing examples
(grep the codebase). Abstractions MUST earn their complexity; prefer the
obvious, boring solution. YAGNI applies — do not build for hypothetical
future requirements.

**Rationale**: A large codebase with inconsistent patterns becomes
unmaintainable. Consistency reduces cognitive load for all contributors.

## Technology Constraints

- **Runtime**: Electron (Chromium + Node.js), multi-process architecture
- **Language**: TypeScript (strict mode), targeting the Node.js version
  specified in `.nvmrc`
- **Package manager**: pnpm with workspaces (monorepo)
- **Build**: Webpack (bundling), Turbo (task orchestration),
  `pnpm build:di` (DI registration generation)
- **DI framework**: `@ogre-tools/injectable` with explicit registration
- **Testing**: Jest (`pnpm test:unit`, `pnpm test:integration`)
- **Linting**: ESLint, configured per-package
- **Platforms**: macOS 12+, Linux (glibc 2.34+), Windows 10+
- **License**: MIT — all contributed code MUST be MIT-compatible

## Development Workflow

1. **Setup**: `nvm install && corepack install && pnpm i`
2. **Build**: `pnpm build:di && pnpm build && pnpm build:app:dir`
3. **Run**: `pnpm start`
4. **Test**: `pnpm test:unit` and `pnpm test:integration`
5. **Clean rebuild**: `rm -rf .turbo packages/core/dist freelens/dist && pnpm build`
6. **DI regeneration**: Run `pnpm build:di` after adding/moving/renaming
   `.injectable.ts` files
7. **Code review**: All PRs MUST pass CI checks (unit tests, integration tests,
   trunk check) before merge
8. **Commit discipline**: Atomic commits with clear messages; avoid mixing
   unrelated changes

Refer to `DEVELOPMENT.md` for detailed build instructions and
`AGENTS.md` for AI agent development guidance.

## Governance

This constitution is the authoritative source of development principles for
the Freelens project. It supersedes ad-hoc conventions and informal agreements.

- **Amendments** require: (1) a documented rationale, (2) review by at least
  one core team member, and (3) a version bump following semantic versioning
- **Version policy**: MAJOR for principle removals or incompatible redefinitions,
  MINOR for new principles or material expansions, PATCH for clarifications
  and wording fixes
- **Compliance**: All PRs and code reviews SHOULD verify alignment with these
  principles. Violations MUST be flagged and either resolved or justified with
  a documented exception
- **Runtime guidance**: See `AGENTS.md` for AI-assisted development patterns
  and `DEVELOPMENT.md` for build/test procedures

**Version**: 1.0.0 | **Ratified**: 2026-02-14 | **Last Amended**: 2026-02-14
