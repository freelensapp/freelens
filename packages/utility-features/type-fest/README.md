# @freelensapp/type-fest

A copy of the types of [type-fest](https://github.com/sindresorhus/type-fest)
**5.10.0** that Freelens uses, together with the internal helpers they reach.
`source/` is third-party code under the MIT license of type-fest, in `license`
next to this file, and does not carry a Freelens header.

Some of these types are part of the published declaration of
`@freelensapp/extensions`, so their shape is extension API. A copy keeps them
fixed: a new major of type-fest can change the floors it requires of its users
(the TypeScript version, `strict`, `exactOptionalPropertyTypes`), and with a
dependency those floors would reach every extension.

Import the types from this package:

```ts
import type { PartialDeep } from "@freelensapp/type-fest";
```

## The copy

The files in `source/` are the files of the same path in the package,
formatted by Biome like the rest of the repository. Formatting and the order
of imports do not change what a declaration means. Only the files that the
exported types reach are copied; a file that none of them reaches is left out.
The Biome override for `source/` turns off `noNamespace`, as `PackageJson` is a
namespace and its shape is part of `Common.PackageJson`.

The files stay declaration files (`.d.ts`). Turning one into a `.ts` file
changes what it means: in a declaration file every member of a namespace is
exported, in a `.ts` file only the ones marked `export`, which would empty the
`PackageJson` namespace. tsc does not emit a declaration file of the sources,
so the declaration build of `@freelensapp/extensions` reads them from here.

`index.ts` is not part of the copy. It re-exports the types Freelens uses.

## Changing the copy

Do not change what the files declare. A type that has to behave differently
gets a type of its own outside this package.

To add a type, copy its file from the same version of type-fest, together with
every file it imports that is not here yet, export it from `index.ts`, and run
`pnpm biome check --write` on `source/` until it reports nothing: a few files
need a second pass before Biome is stable.

Moving to another version replaces every file with its counterpart, formatted
the same way. Before it does, check that each exported type is identical to the
one of the version it replaces, for representative inputs, with `IfEquals` of
`@freelensapp/utilities`. A version that drops support for a compiler option
the workspace or an extension may leave off is a breaking change of the
extension API.
