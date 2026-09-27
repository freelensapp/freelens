# @freelensapp/extensions

The extension API of [Freelens](https://freelens.app): the `Common`, `Main` and
`Renderer` namespaces an extension is written against.

The published package is a small runtime shim over
`globalThis.FreelensExtensionApi`, which the running application assigns at
startup, paired with the rolled-up type declaration. Nothing of the host is
bundled into an extension by depending on it.

## Host-provided libraries

Five libraries are **provided by the host at runtime** and are declared as
optional peer dependencies:

| Peer dependency                | Read from the global as                         |
| ------------------------------ | ----------------------------------------------- |
| `react`                        | `FreelensExtensionApi.React`                    |
| `mobx`                         | `FreelensExtensionApi.Mobx`                     |
| `monaco-editor`                | `FreelensExtensionApi.MonacoEditor`             |
| `@ogre-tools/injectable`       | `FreelensExtensionApi.OgreToolsInjectable`      |
| `@ogre-tools/injectable-react` | `FreelensExtensionApi.OgreToolsInjectableReact` |

They are optional because an extension needs an installed copy only of the ones
it actually imports — for types and for its own build — and `monaco-editor`
alone is close to 100 MB. Install what you import; the rest are neither needed
nor installed.

Being optional does not make bundling them safe. What keeps a second copy of
React or mobx out of your bundle is **marking the specifier external** in your
bundler and reading it back off `globalThis.FreelensExtensionApi`: two instances
of these modules misbehave, React by throwing "invalid hook call" and mobx by
silently no longer reacting. Each process publishes the set it has — the
renderer publishes all of them, the main process publishes `Mobx` and
`OgreToolsInjectable` only.

`electron` is an optional peer on the same grounds: the host provides it, and
only an extension that names it needs it installed.

Everything else this package depends on — `chart.js`, `react-select`, `conf`,
`immer`, `rfc6902`, `type-fest` — is free to bundle.

## Documentation

- [Extension API contracts](https://github.com/freelensapp/freelens/blob/main/docs/v2-extension-api.md)
- [Migrating an extension from v1](https://github.com/freelensapp/freelens/blob/main/docs/v2-extension-migration.md)
- [What an extension may ship besides JavaScript](https://github.com/freelensapp/freelens/blob/main/docs/v2-extension-abi.md)
