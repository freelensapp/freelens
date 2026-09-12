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
}

export const defaultLogViewerPreferences: LogViewerPreferences = {
  showTimestamps: false,
  showWordWrap: true,
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

/**
 * A named search a user can re-apply from the search box.
 *
 * The search state is kept as the raw URL params rather than a parsed model:
 * applying one is then just writing those params back, and this preference does
 * not have to track the facet types living in the renderer.
 */
export interface SavedSearch {
  name: string;
  /** Route it was saved from. Searches are offered on that view only. */
  view: string;
  /** The `search` param: free text over every searchable field. */
  search: string;
  /** The `searchOp` param, empty for the default operator. */
  op: string;
  /** The `facets` param, already serialized. */
  facets: string;
}

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

export type ExtensionRegistryLocation = "default" | "npmrc" | "custom";

export type ExtensionRegistry =
  | {
      location: "default" | "npmrc";
      customUrl?: undefined;
    }
  | {
      location: "custom";
      customUrl: string;
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
