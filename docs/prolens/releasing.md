# Releasing ProLens

ProLens is released from `chago1991/prolens` only, by the workflow
`.github/workflows/prolens-release.yml`. Nothing is published to Freelens, to
npm or to a package repository.

## Versions

- The application version is `version` in `freelens/package.json`. It names
  the installers, the release tag (`v<version>`) and what the update check
  compares.
- The extension API version is `version` in `packages/core/package.json`.
  Extensions declare the Freelens versions they support in `engines.freelens`,
  and ProLens checks them against this version, so it stays on the Freelens
  line it is based on. Changing it to the application version would make
  ProLens reject every extension written for Freelens 2.
- The other workspace packages are private and keep the version of the
  Freelens line as well.

## How the workflow runs

| Trigger                                 | Stage                 | Result                                                   |
| --------------------------------------- | --------------------- | -------------------------------------------------------- |
| Pull request to `main`                  | A: build and validate | Checks and all installers as run artifacts               |
| Push to `main`                          | A: build and validate | The same; a tag can only release a commit that passed it |
| Manual run without a tag                | A: build and validate | The same                                                 |
| Push of a `v*` tag, manual run with tag | B: version release    | Checks, installers, and a **draft** release              |

Every run executes:

1. `prepare`: decides the stage. For a release it requires that the tag
   matches `freelens/package.json`, points to a commit on `main`, and that this
   commit passed the workflow as a push to `main`. It also detects which
   signing credentials exist.
2. `lint`: `pnpm type:check` and `pnpm biome:check`.
3. `unit-tests`: the unit tests, in four shards.
4. `build`: one job per platform and architecture, each on a native runner,
   because node-pty and the bundled `kubectl`, `helm` and `freelens-k8s-proxy`
   are native:

   | Runner             | Platform      | Files                       |
   | ------------------ | ------------- | --------------------------- |
   | `macos-26`         | macOS arm64   | `.dmg`, `.zip`              |
   | `macos-26-intel`   | macOS x64     | `.dmg`, `.zip`              |
   | `windows-2025`     | Windows x64   | NSIS installer `.exe`       |
   | `windows-11-arm`   | Windows arm64 | NSIS installer `.exe`       |
   | `ubuntu-24.04`     | Linux x64     | `.AppImage`, `.deb`, `.rpm` |
   | `ubuntu-24.04-arm` | Linux arm64   | `.AppImage`, `.deb`, `.rpm` |

   Each job verifies the `app.asar`, checks with `file` that the executable,
   every `.node` module and the bundled binaries are built for its
   architecture, verifies the code signature, renames the files to
   `ProLens-<version>-<os>-<arch>.<ext>`, writes a `.sha256` next to each, and
   uploads them as the artifact `prolens-<os>-<arch>`.
5. `release` (stage B only): requires the checks to have passed and every
   platform's files to be present, verifies every checksum, writes
   `ProLens-<version>-SHA256SUMS.txt`, attests the build provenance of every
   file, and creates the draft release with the notes from `RELEASE_NOTES.md`
   plus the signing status. A re-run refreshes the files of the same draft; a
   published release is never changed.

A platform that fails to build stops the release: no draft is created. To
release without it anyway, run the workflow manually with the tag and
`allow-partial`; the draft then lists the missing files in its notes.

## Making a release

1. Update `CHANGELOG.md` and `RELEASE_NOTES.md` (its first heading names the
   version, such as `# ProLens v1.1.0`), and set the version:

   ```sh
   pnpm --filter freelens exec npm version 1.1.0 --no-git-tag-version
   ```

   Update the `<release>` entry of `freelens/build/metainfo.xml` to match.
2. Merge the change to `main` through a pull request and wait for
   **ProLens Release** to pass on `main`.
3. Tag that commit and push the tag:

   ```sh
   git tag -a v1.1.0 -m "ProLens v1.1.0"
   git push origin v1.1.0
   ```

4. Wait for the run of the tag. Its summary lists the files of each platform
   and links the draft.
5. Review the draft: every platform's files, the checksums, the notes and the
   signing status. Install it on each platform you can.
6. Publish it, in the GitHub UI or with:

   ```sh
   gh release edit v1.1.0 --repo chago1991/prolens --draft=false --latest
   ```

   Only a published, non-prerelease release is what the update check of
   installed copies reports. A tag with a suffix such as `v1.1.0-rc.1` creates
   a prerelease.

## Building locally

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm build:resources
pnpm build:app dmg zip --arm64                 # macOS, add --config.mac.identity=- to sign ad-hoc
pnpm build:app AppImage deb rpm --x64          # Linux (rpm needs the rpm package)
pnpm build:app nsis --x64                      # Windows
```

The files are written to `freelens/dist`. electron-builder packs node-pty for
the platform it runs on, so build each platform on that platform.

## Signing and notarization

Signing is optional. Without credentials the workflow still builds every
platform, and the release notes state what is unsigned. Credentials are GitHub
Actions secrets of the repository (Settings → Secrets and variables →
Actions), never files in the repository.

| Secret / variable                                                                | Purpose                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `CSC_LINK`                                                                       | Developer ID Application certificate as a base64 `.p12`            |
| `CSC_KEY_PASSWORD`                                                               | Password of that certificate                                       |
| `APPLEID`, `APPLEIDPASS`, `APPLETEAMID`                                          | Apple ID, app-specific password and team id for notarization       |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`                      | Azure Trusted Signing (Windows)                                    |
| variables `AZURE_ENDPOINT`, `AZURE_CODE_SIGNING_NAME`, `AZURE_CERT_PROFILE_NAME` | Azure Trusted Signing account and profile                          |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`                                           | Authenticode `.pfx` certificate, used when Azure is not configured |

What each platform gets:

- **macOS** with `CSC_LINK`: signed with the Developer ID and the hardened
  runtime (`build/entitlements.mac.plist`). With the Apple credentials as
  well, `build/notarize.cjs` notarizes the app and staples the ticket before
  the DMG and ZIP are made, and the workflow checks it with `stapler` and
  `spctl`. Without a certificate the app is signed ad-hoc: macOS then reports
  an unidentified developer, and the user has to allow it once in System
  Settings → Privacy & Security.
- **Windows** with Azure Trusted Signing: every binary of the app is signed
  before the installer is made, except node-pty's ConPTY, which keeps its
  Microsoft signature, and then the installer. With a `.pfx` instead,
  electron-builder signs the app and the installer. Without either, the
  installer is unsigned and SmartScreen warns about it.
- **Linux** packages are not signed. Users verify them with the checksums or
  with `gh attestation verify <file> --repo chago1991/prolens`.

### Checklist before publishing a release

- [ ] `freelens/package.json`, the tag, `CHANGELOG.md`, `RELEASE_NOTES.md` and
  `freelens/build/metainfo.xml` name the same version.
- [ ] **ProLens Release** passed on `main` for the tagged commit, and the run
  of the tag passed.
- [ ] The draft has the files of all six platforms, and
  `ProLens-<version>-SHA256SUMS.txt`.
- [ ] The "Signing" section of the notes matches what you expect. If signing
  was intended, the secrets above are set and the build logs show the
  signature checks passing.
- [ ] The installers start on the platforms you can test, show ProLens and its
  icon, and report the right version in About.
- [ ] The release is published with `--latest` (unless it is a prerelease).

## Updates

ProLens has no automatic updater. When the Welcome screen opens, and in the
About dialog, it asks the GitHub API for the latest release of
`chago1991/prolens` (drafts and prereleases are never "latest") and shows a
notification when that version is higher; the user downloads and installs the
new version. Nothing is
downloaded or installed by the application, so no update can install an
unsigned or foreign build, and Freelens releases are never consulted.

Automatic updates (electron-updater) are left out on purpose: on macOS they
require a Developer ID signed and notarized application, and Windows and
Linux updates would install whatever the release carries without a signature
check while the builds are unsigned. They can be added once every platform is
signed.
