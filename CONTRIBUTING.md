# Contributing to ProLens

Thank you for considering a contribution to ProLens. ProLens is a fork of
[Freelens](https://github.com/freelensapp/freelens): a change that is not
specific to ProLens is usually better proposed to Freelens first, so that both
projects get it.

## Reporting issues

Check the [existing issues](https://github.com/chago1991/prolens/issues)
first. A new issue should include:

- the steps to reproduce the problem,
- the ProLens version (Help → About), your operating system and its
  architecture, and the file you installed,
- for a problem with an AI assistant: the assistant and its version, and what
  the approval dialog showed, if it appeared.

Report security vulnerabilities privately, as described in
[SECURITY.md](SECURITY.md), not in an issue.

## Pull requests

1. Fork the repository and create a branch for the change.
2. Make the change, with tests where it changes behaviour.
3. Run the checks:

   ```sh
   pnpm build
   pnpm type:check
   pnpm biome:check
   pnpm test:unit
   pnpm trunk check
   ```

4. Open a pull request against `main` that says what the change does and why.
   The **ProLens Release** workflow builds the installers of every platform
   for it, as artifacts of the run, so the change can be tried before it is
   merged.

[DEVELOPMENT.md](DEVELOPMENT.md) explains how to set up the development
environment, and [AGENTS.md](AGENTS.md) collects the conventions of the code
base: dependency injection, styling, file headers and the extension API.

## Compatibility

ProLens runs extensions written for Freelens. Changes to the extension API
(`packages/extensions`, `packages/core/src/extensions`) must keep them working;
the contracts are in [docs/extensions/api.md](docs/extensions/api.md).

## Licence

ProLens is licensed under the MIT License, like Freelens and OpenLens. By
contributing you agree that your contribution is licensed the same way. Keep
the existing copyright notices; new files get the header described in
AGENTS.md.

## Releases

Releases are made by the maintainer; the process is described in
[docs/prolens/releasing.md](docs/prolens/releasing.md).
