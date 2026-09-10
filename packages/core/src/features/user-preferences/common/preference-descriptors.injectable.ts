/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { merge } from "es-toolkit/compat";
import { observable } from "mobx";
import kubeDirectoryPathInjectable from "../../../common/os/kube-directory-path.injectable";
import { defaultColorThemePreference } from "../../../common/vars";
import currentTimezoneInjectable from "../../../common/vars/current-timezone.injectable";
import {
  ClusterPageMenuOrder,
  defaultEditorConfig,
  defaultExtensionRegistryUrlLocation,
  defaultLogViewerPreferences,
  defaultPackageMirror,
  defaultTerminalConfig,
  getPreferenceDescriptor,
  packageMirrors,
} from "./preferences-helpers";

import type { ObservableMap } from "mobx";

import type {
  EditorConfiguration,
  ExtensionRegistry,
  KubeconfigSyncEntry,
  KubeconfigSyncValue,
  LogViewerPreferences,
  TerminalConfig,
} from "./preferences-helpers";

export type PreferenceDescriptors = ReturnType<(typeof userPreferenceDescriptorsInjectable)["instantiate"]>;

const userPreferenceDescriptorsInjectable = getInjectable({
  id: "user-preference-descriptors",
  instantiate: (di) => {
    const currentTimezone = di.inject(currentTimezoneInjectable);
    const mainKubeFolderPath = di.inject(kubeDirectoryPathInjectable);

    return {
      httpsProxy: getPreferenceDescriptor<string | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val || undefined,
      }),
      shell: getPreferenceDescriptor<string | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val || undefined,
      }),
      colorTheme: getPreferenceDescriptor<string>({
        fromStore: (val) => val || defaultColorThemePreference,
        toStore: (val) => (!val || val === defaultColorThemePreference ? undefined : val),
      }),
      terminalTheme: getPreferenceDescriptor<string>({
        fromStore: (val) => val || "",
        toStore: (val) => val || undefined,
      }),
      localeTimezone: getPreferenceDescriptor<string>({
        fromStore: (val) => val || currentTimezone,
        toStore: (val) => (!val || val === currentTimezone ? undefined : val),
      }),
      allowUntrustedCAs: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      bypassKubeApiProxy: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      allowErrorReporting: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? true,
        toStore: (val) => (val ? undefined : val),
      }),
      downloadMirror: getPreferenceDescriptor<string>({
        fromStore: (val) => (!val || !packageMirrors.has(val) ? defaultPackageMirror : val),
        toStore: (val) => (val === defaultPackageMirror ? undefined : val),
      }),
      downloadCustomMirror: getPreferenceDescriptor<string>({
        fromStore: (val) => val || "",
        toStore: (val) => val || undefined,
      }),
      downloadKubectlBinaries: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? true,
        toStore: (val) => (val ? undefined : val),
      }),
      downloadBinariesPath: getPreferenceDescriptor<string | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val || undefined,
      }),
      kubectlBinariesPath: getPreferenceDescriptor<string | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val || undefined,
      }),
      helmBinariesPath: getPreferenceDescriptor<string | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val || undefined,
      }),
      helmServerSide: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? true,
        toStore: (val) => (val ? undefined : val),
      }),
      openAtLogin: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      showTrayIcon: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? true,
        toStore: (val) => (val ? undefined : val),
      }),
      hotbarAutoHide: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      persistentSearch: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      logViewerPreferences: getPreferenceDescriptor<Partial<LogViewerPreferences>, LogViewerPreferences>({
        fromStore: (val) => ({
          ...defaultLogViewerPreferences,
          ...val,
        }),
        toStore: (val) => {
          const storedValue: Partial<LogViewerPreferences> = {};

          for (const key of Object.keys(defaultLogViewerPreferences) as (keyof LogViewerPreferences)[]) {
            if (val[key] !== defaultLogViewerPreferences[key]) {
              storedValue[key] = val[key];
            }
          }

          return Object.keys(storedValue).length > 0 ? storedValue : undefined;
        },
      }),
      terminalCopyOnSelect: getPreferenceDescriptor<boolean>({
        fromStore: (val) => val ?? false,
        toStore: (val) => (!val ? undefined : val),
      }),
      hiddenTableColumns: getPreferenceDescriptor<[string, string[]][], Map<string, Set<string>>>({
        fromStore: (val = []) => new Map(val.map(([tableId, columnIds]) => [tableId, new Set(columnIds)])),
        toStore: (val) => {
          const res: [string, string[]][] = [];

          for (const [table, columns] of val) {
            if (columns.size) {
              res.push([table, Array.from(columns)]);
            }
          }

          return res.length ? res : undefined;
        },
      }),
      syncKubeconfigEntries: (() => {
        const map = observable.map<string, KubeconfigSyncValue>();

        return getPreferenceDescriptor<KubeconfigSyncEntry[], ObservableMap<string, KubeconfigSyncValue>>({
          fromStore: (val) => {
            const entries = val?.map(({ filePath, ...rest }) => [filePath, rest] as const) ?? [
              [mainKubeFolderPath, {} as KubeconfigSyncValue] as const,
            ];
            const desired = new Map(entries);

            for (const key of Array.from(map.keys())) {
              if (!desired.has(key)) {
                map.delete(key);
              }
            }
            for (const [key, value] of desired) {
              map.set(key, value);
            }

            return map;
          },
          toStore: (val) =>
            val.size === 1 && val.has(mainKubeFolderPath)
              ? undefined
              : Array.from(val, ([filePath, rest]) => ({ filePath, ...rest })),
        });
      })(),
      editorConfiguration: getPreferenceDescriptor<Partial<EditorConfiguration>, EditorConfiguration>({
        fromStore: (val) => merge(defaultEditorConfig, val),
        toStore: (val) => val,
      }),
      terminalConfig: getPreferenceDescriptor<Partial<TerminalConfig>, TerminalConfig>({
        fromStore: (val) => merge(defaultTerminalConfig, val),
        toStore: (val) => val,
      }),
      extensionRegistryUrl: getPreferenceDescriptor<ExtensionRegistry>({
        fromStore: (val) =>
          val ?? {
            location: defaultExtensionRegistryUrlLocation,
          },
        toStore: (val) => (val.location === defaultExtensionRegistryUrlLocation ? undefined : val),
      }),
      clusterPageMenuOrder: getPreferenceDescriptor<ClusterPageMenuOrder | undefined>({
        fromStore: (val) => val,
        toStore: (val) => val,
      }),
    } as const;
  },
});

export default userPreferenceDescriptorsInjectable;
