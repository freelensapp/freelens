# @freelensapp/extensions

The extension API of [Freelens](https://freelens.app): the `Common`, `Main` and
`Renderer` namespaces an extension is written against.

The published package is a small runtime shim over
`globalThis.FreelensExtensionApi`, which the running application assigns at
startup, paired with the rolled-up type declaration. Nothing of the host is
bundled into an extension by depending on it.

## Host-provided libraries

These libraries are **provided by the host at runtime** and are declared as
optional peer dependencies:

| Peer dependency | Read from the global as             |
| --------------- | ----------------------------------- |
| `react`         | `FreelensExtensionApi.React`        |
| `react-dom`     | `FreelensExtensionApi.ReactDom`     |
| `mobx`          | `FreelensExtensionApi.Mobx`         |
| `mobx-react`    | `FreelensExtensionApi.MobxReact`    |
| `monaco-editor` | `FreelensExtensionApi.MonacoEditor` |

`@types/react` and `@types/react-dom` are optional peers too, so that the
declaration compiles against the same React types as your own code.

They are optional because an extension needs an installed copy only of the ones
it actually imports — for types and for its own build — and `monaco-editor`
alone is close to 100 MB. Install what you import, at the version the host
runs; the rest are neither needed nor installed. The peer ranges are how your
package manager tells you that a copy does not match the host.

Being optional does not make bundling them safe. What keeps a second copy of
React or mobx out of your bundle is **marking the specifier external** in your
bundler and reading it back off `globalThis.FreelensExtensionApi`: two instances
of these modules misbehave, React by throwing "invalid hook call" and mobx by
silently no longer reacting. Each process publishes the set it has — the
renderer publishes all of them, the main process publishes `Mobx` only.

The host's dependency-injection library, `@ogre-tools/injectable`, is not among
them: it is internal to the host and not published on the global. An extension
that wants dependency injection bundles its own copy, at any version, with its
own container.

`electron` is an optional peer on the same grounds: the host provides it, and
only an extension that names it needs it installed.

Everything else this package depends on — `chart.js`, `react-select`, `conf`,
`immer`, `rfc6902`, `type-fest` — is free to bundle. `react-select` requires
`react` and `react-dom` as peers, so a React is installed in your tree even if
you import none; mark the host-provided modules external all the same.

## Documentation

- [Extension API contracts](https://github.com/freelensapp/freelens/blob/main/docs/extensions/api.md)
- [Migrating an extension from v1](https://github.com/freelensapp/freelens/blob/main/docs/extensions/migrating-from-v1.md)
- [What an extension may ship besides JavaScript](https://github.com/freelensapp/freelens/blob/main/docs/extensions/binaries.md)
