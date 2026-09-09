/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 *
 * Palette based on Ayu Colors by Konstantin Pschera, licensed under the MIT License.
 * https://github.com/ayu-theme/ayu-colors
 */

import { getInjectable } from "@ogre-tools/injectable";
import { customMonacoThemeInjectionToken } from "../monaco-themes";

const ayuDarkMonacoThemeInjectable = getInjectable({
  id: "ayu-dark-monaco-theme",
  instantiate: () => ({
    name: "ayu-dark",
    base: "vs-dark" as const,
    inherit: true,
    rules: [
      {
        background: "0d1017",
        foreground: "bfbdb6",
        token: "",
      },
      {
        fontStyle: "italic",
        foreground: "5a6673",
        token: "comment",
      },
      {
        foreground: "aad94c",
        token: "string",
      },
      {
        foreground: "95e6cb",
        token: "string.escape",
      },
      {
        foreground: "95e6cb",
        token: "string.regexp",
      },
      {
        foreground: "d2a6ff",
        token: "constant",
      },
      {
        foreground: "d2a6ff",
        token: "constant.numeric",
      },
      {
        foreground: "d2a6ff",
        token: "constant.language",
      },
      {
        foreground: "ff8f40",
        token: "keyword",
      },
      {
        foreground: "f29668",
        token: "keyword.operator",
      },
      {
        foreground: "ff8f40",
        token: "storage",
      },
      {
        foreground: "ffb454",
        token: "entity.name.function",
      },
      {
        foreground: "ffb454",
        token: "support.function",
      },
      {
        foreground: "59c2ff",
        token: "entity.name.type",
      },
      {
        foreground: "59c2ff",
        token: "entity.name.class",
      },
      {
        foreground: "39bae6",
        token: "entity.name.tag",
      },
      {
        foreground: "f07178",
        token: "entity.other.attribute-name",
      },
      {
        foreground: "f07178",
        token: "variable.other.property",
      },
      {
        foreground: "d2a6ff",
        token: "variable.parameter",
      },
      {
        foreground: "59c2ff",
        token: "support.type",
      },
      {
        foreground: "e6c08a",
        token: "support.constant",
      },
      {
        background: "d95757",
        foreground: "0d1017",
        token: "invalid",
      },
    ],
    colors: {
      "editor.foreground": "#bfbdb6",
      "editor.background": "#0d1017",
      "editor.selectionBackground": "#3388ff40",
      "editor.inactiveSelectionBackground": "#80b5ff26",
      "editor.lineHighlightBackground": "#161a24",
      "editor.findMatchBackground": "#4c4126",
      "editor.findMatchHighlightBackground": "#4c412680",
      "editorCursor.foreground": "#e6b450",
      "editorWhitespace.foreground": "#5a6378a6",
      "editorLineNumber.foreground": "#5a6378a6",
      "editorLineNumber.activeForeground": "#5a6378",
      "editorIndentGuide.background": "#5a637842",
      "editorIndentGuide.activeBackground": "#5a6378a1",
    },
  }),
  injectionToken: customMonacoThemeInjectionToken,
});

export default ayuDarkMonacoThemeInjectable;
