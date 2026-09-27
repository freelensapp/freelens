/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The naming rule for the singletons the host publishes on
// `globalThis.FreelensExtensionApi` (#2450, contract in #2304), and the startup
// assertion that holds the host to it.
//
// A published name is *derived* from the module id rather than chosen: drop the
// `@` of a scope, split on `-`, `/` and `.`, capitalise each segment. So
// `react-dom` is `ReactDom`, `react/jsx-runtime` is `ReactJsxRuntime` and
// `@ogre-tools/injectable-react` is `OgreToolsInjectableReact`.
//
// A rule rather than canonical names, because canonical names need an exception
// table -- mobx's own UMD global is lower-case and ogre-tools has none -- and
// because a rule is something an extension's bundler plugin can apply to the
// specifiers it marks external instead of carrying a map it can mistype. It
// also settles `ReactDom` against `ReactDOM` in favour of what the published
// extensions already write, so the host's spelling is the one that changed.

/**
 * The name `moduleId` is published under on `globalThis.FreelensExtensionApi`.
 */
export const globalNameForModuleId = (moduleId: string): string =>
  moduleId
    .replace(/^@/, "")
    .split(/[-/.]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

/**
 * Holds a process's published singletons to {@link globalNameForModuleId}.
 *
 * The assertion is the point of the rule. A misspelled key is not a build
 * error and not a runtime error either: the extension bundle reads `undefined`
 * off the global and fails later, somewhere else, in somebody else's
 * repository. Failing here means it fails at startup, in this repository's
 * integration suite, before any extension sees it.
 *
 * An undefined value is checked for the same reason: a module that resolved to
 * nothing publishes a key that is present and useless.
 */
export const assertExtensionApiSingletonNames = <TSingletons extends object>(
  singletons: TSingletons,
  moduleIds: Record<keyof TSingletons, string>,
): void => {
  for (const [name, moduleId] of Object.entries(moduleIds) as [keyof TSingletons & string, string][]) {
    const expectedName = globalNameForModuleId(moduleId);

    if (name !== expectedName) {
      throw new Error(
        `Extension API singleton for "${moduleId}" must be published as "${expectedName}", not "${name}": ` +
          "the name is derived from the module id, and an extension bundle reading the wrong one gets undefined.",
      );
    }

    if (singletons[name] === undefined) {
      throw new Error(`Extension API singleton "${name}" ("${moduleId}") resolved to undefined and cannot be shared.`);
    }
  }
};
