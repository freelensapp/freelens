/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { extensionCustomResourceColumnsInjectionToken } from "./extension-custom-resource-columns-injection-token";

import type { CustomResourceColumn } from "./custom-resource-columns-registration";

/** A printer column an enabled extension registered, with its name. */
export interface ColumnOfExtension {
  extensionName: string;
  column: CustomResourceColumn;
}

/**
 * The columns the enabled extensions registered for the objects of `kind` in
 * `apiVersion`, by the name of the printer column. A column no extension
 * names is not in the map.
 */
export type GetCustomResourceColumnsOfExtensions = (
  kind: string,
  apiVersion: string,
) => ReadonlyMap<string, ColumnOfExtension>;

const noColumns: ReadonlyMap<string, ColumnOfExtension> = new Map();

const keyOf = (kind: string, apiVersion: string) => `${kind}\u0000${apiVersion}`;

const customResourceColumnsOfExtensionsInjectable = getInjectable({
  id: "custom-resource-columns-of-extensions",

  instantiate: (di): GetCustomResourceColumnsOfExtensions => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const logger = di.inject(loggerInjectionToken);
    const registered = computedInjectMany(extensionCustomResourceColumnsInjectionToken);
    // A conflict is warned about once, not on every computation.
    const warnedConflicts = new Set<string>();

    const byKindAndApiVersion = computed(() => {
      const result = new Map<string, Map<string, ColumnOfExtension>>();

      // In the order the extensions were registered: the first one that names
      // a column keeps it.
      for (const { extensionName, kind, apiVersions, columns, enabled } of registered.get()) {
        if (!enabled.get()) {
          continue;
        }

        for (const apiVersion of new Set(apiVersions)) {
          const key = keyOf(kind, apiVersion);
          const columnsOfKey = result.get(key) ?? new Map<string, ColumnOfExtension>();

          result.set(key, columnsOfKey);

          for (const [name, column] of Object.entries(columns)) {
            const existing = columnsOfKey.get(name);

            if (existing) {
              const conflict = `${key}\u0000${name}\u0000${existing.extensionName}\u0000${extensionName}`;

              if (!warnedConflicts.has(conflict)) {
                warnedConflicts.add(conflict);
                logger.warn(
                  `[EXTENSIONS]: the column "${name}" of ${kind} (${apiVersion}) is registered by ${existing.extensionName} and by ${extensionName}; the host uses the one of ${existing.extensionName}`,
                );
              }

              continue;
            }

            columnsOfKey.set(name, { extensionName, column });
          }
        }
      }

      return result;
    });

    return (kind, apiVersion) => byKindAndApiVersion.get().get(keyOf(kind, apiVersion)) ?? noColumns;
  },
});

export default customResourceColumnsOfExtensionsInjectable;
