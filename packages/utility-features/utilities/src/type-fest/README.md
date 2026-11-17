# Vendored type-fest

`source/` is a copy of the types of [type-fest](https://github.com/sindresorhus/type-fest)
**5.10.0** that Freelens uses, together with the internal helpers they reach.
It is third-party code under the MIT license of type-fest, in `license` next to
this file, and does not carry a Freelens header.

Some of these types are part of the published declaration of
`@freelensapp/extensions`, so their shape is extension API. A copy keeps them
fixed: a new major of type-fest can change the floors it requires of its users
(the TypeScript version, `strict`, `exactOptionalPropertyTypes`), and with a
dependency those floors would reach every extension.

## The copy

Every file in `source/` is byte-identical with the file of the same path in
the package. Only the files that the exported types reach are copied; a file
that none of them reaches is left out. Biome leaves `source/` alone, so that
the copy stays comparable with the package.

The files stay declaration files (`.d.ts`). Turning one into a `.ts` file
changes what it means: in a declaration file every member of a namespace is
exported, in a `.ts` file only the ones marked `export`, which would empty the
`PackageJson` namespace. tsc does not emit a declaration file of the sources,
so the declaration build of `@freelensapp/extensions` reads them from here.

`index.ts` is not part of the copy. It re-exports the types Freelens uses, and
`@freelensapp/utilities` re-exports them in turn.

## Changing the copy

Do not edit the files. A type that has to behave differently gets a type of
its own outside this directory.

To add a type, copy its file from the same version of type-fest, together with
every file it imports that is not here yet, and export it from `index.ts`.

Moving to another version replaces every file with its counterpart. Before it
does, check that each exported type is identical to the one of the version it
replaces, for representative inputs, with `IfEquals` of this package. A
version that drops support for a compiler option the workspace or an
extension may leave off is a breaking change of the extension API.
