/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultEditorFontFamily, defaultFontSize, defaultTerminalFontFamily } from "../../../common/vars";

import type { editor } from "monaco-editor";

import type { PreferenceDescriptors } from "./preference-descriptors.injectable";

export interface KubeconfigSyncEntry extends KubeconfigSyncValue {
  filePath: string;
}

export interface KubeconfigSyncValue {}
export interface TerminalConfig {
  fontSize: number;
  fontFamily: string;
}

export interface LogViewerPreferences {
  showTimestamps: boolean;
  showWordWrap: boolean;
  /**
   * A combined logs tab reads at most this many pods of its workload, the
   * first ones by name. Every refresh sends one request per pod, so a
   * DaemonSet on a large cluster would otherwise turn into a burst of requests
   * every few seconds.
   */
  maxCombinedLogsPods: number;
}

export const defaultMaxCombinedLogsPods = 20;
export const minMaxCombinedLogsPods = 1;
export const maxMaxCombinedLogsPods = 100;

/**
 * Brings a value of `maxCombinedLogsPods` into its range. It is applied both
 * when the preference is stored and when it is read, so that a hand-edited
 * store cannot take it outside the range. A value that is not a number gives
 * the default.
 */
export function clampMaxCombinedLogsPods(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultMaxCombinedLogsPods;
  }

  return Math.min(maxMaxCombinedLogsPods, Math.max(minMaxCombinedLogsPods, Math.round(value)));
}

export const defaultLogViewerPreferences: LogViewerPreferences = {
  showTimestamps: false,
  showWordWrap: true,
  maxCombinedLogsPods: defaultMaxCombinedLogsPods,
};

export const defaultTerminalConfig: TerminalConfig = {
  fontSize: defaultFontSize,
  fontFamily: defaultTerminalFontFamily,
};

export interface BaseEditorConfiguration
  extends Required<
    Pick<editor.IStandaloneEditorConstructionOptions, "minimap" | "tabSize" | "fontSize" | "fontFamily">
  > {
  lineNumbers: NonNullable<
    Exclude<editor.IStandaloneEditorConstructionOptions["lineNumbers"], (...args: any[]) => void>
  >;
}

export type EditorConfiguration = Required<BaseEditorConfiguration>;

export const defaultEditorConfig: EditorConfiguration = {
  tabSize: 2,
  lineNumbers: "on",
  fontSize: defaultFontSize,
  fontFamily: defaultEditorFontFamily,
  minimap: {
    enabled: true,
    side: "right",
  },
};

export type StoreType<P> = P extends PreferenceDescription<unknown, infer Store> ? Store : never;

export interface PreferenceDescription<T, R = T> {
  fromStore(val: T | undefined): R;
  toStore(val: R): T | undefined;
}

export const getPreferenceDescriptor = <T, R = T>(desc: PreferenceDescription<T, R>) => desc;

export interface DownloadMirror {
  url: string;
  label: string;
  platforms: Set<NodeJS.Platform>;
}

export const defaultPackageMirror = "default";
export const customPackageMirror = "custom";

const defaultDownloadMirrorData: DownloadMirror = {
  url: "https://dl.k8s.io/release",
  label: "Default (Google)",
  platforms: new Set(["darwin", "win32", "linux"]),
};

const customPackageMirrorData: DownloadMirror = {
  url: "",
  label: "Custom",
  platforms: new Set(["darwin", "win32", "linux"]),
};

export const packageMirrors = new Map<string, DownloadMirror>([
  [defaultPackageMirror, defaultDownloadMirrorData],
  [customPackageMirror, customPackageMirrorData],
]);

export type ExtensionRegistryLocation = "default" | "custom";

export type ExtensionRegistry =
  | {
      location: "default";
      customUrl?: undefined;
    }
  | {
      location: "custom";
      customUrl: string;
    };

/**
 * The shapes `extensionRegistryUrl` may have on disk. The `npmrc` location was
 * implemented by forking the bundled `pnpm`, which the application no longer
 * ships, so a value stored before its removal names a location that no longer
 * exists. `fromStore` coerces it to `default`.
 */
export type StoredExtensionRegistry =
  | ExtensionRegistry
  | {
      location: "npmrc";
      customUrl?: undefined;
    };

export type ClusterPageMenuOrder = {
  [key: string]: number;
};

export const defaultExtensionRegistryUrlLocation = "default";
export const defaultExtensionRegistryUrl = "https://registry.npmjs.org";

type PreferencesModelType<field extends keyof PreferenceDescriptors> =
  PreferenceDescriptors[field] extends PreferenceDescription<infer T, any> ? T : never;
type UserStoreModelType<field extends keyof PreferenceDescriptors> =
  PreferenceDescriptors[field] extends PreferenceDescription<any, infer T> ? T : never;

export type UserStoreFlatModel = {
  [field in keyof PreferenceDescriptors]: UserStoreModelType<field>;
};

export type UserPreferencesModel = {
  [field in keyof PreferenceDescriptors]?: PreferencesModelType<field>;
};
