/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { editor } from "monaco-editor";

/**
 * The names of the built-in editor themes: Monaco's own, and `clouds-midnight`, the dark editor
 * theme of the built-in Freelens theme. Every theme registers its own editor themes under further
 * names, which `LensTheme.monacoTheme` gives.
 */
export type MonacoTheme = "vs" | "vs-dark" | "hc-black" | MonacoCustomTheme;
export type MonacoCustomTheme = "clouds-midnight";

export interface MonacoThemeData extends editor.IStandaloneThemeData {
  name: string;
}
