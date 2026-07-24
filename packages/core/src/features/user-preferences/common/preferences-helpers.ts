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

export type CustomThemeColors = Record<string, string>;

const customThemeColorNamePattern = /^[a-zA-Z][\w-]*$/;
const hexColorPattern = /^#[\da-f]{6}$/i;

export const normalizeCustomThemeColors = (colors: Partial<Record<string, string>> = {}): CustomThemeColors => {
  const normalized: CustomThemeColors = {};

  for (const [colorName, color] of Object.entries(colors)) {
    if (typeof color === "string" && customThemeColorNamePattern.test(colorName) && hexColorPattern.test(color)) {
      normalized[colorName] = color;
    }
  }

  return normalized;
};

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
export const chinaPackageMirror = "china";
export const customPackageMirror = "custom";

const defaultDownloadMirrorData: DownloadMirror = {
  url: "https://dl.k8s.io/release",
  label: "Default (Google)",
  platforms: new Set(["darwin", "win32", "linux"]),
};

const chinaPackageMirrorData: DownloadMirror = {
  url: "https://mirror.azure.cn/kubernetes/kubectl",
  label: "China (Azure)",
  platforms: new Set(["win32", "linux"]),
};

const customPackageMirrorData: DownloadMirror = {
  url: "",
  label: "Custom",
  platforms: new Set(["darwin", "win32", "linux"]),
};

export const packageMirrors = new Map<string, DownloadMirror>([
  [defaultPackageMirror, defaultDownloadMirrorData],
  [chinaPackageMirror, chinaPackageMirrorData],
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
