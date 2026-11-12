/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 *
 * Palette based on Ayu Colors by Konstantin Pschera, licensed under the MIT License.
 * https://github.com/ayu-theme/ayu-colors
 */

import { getInjectable } from "@ogre-tools/injectable";
import { customMonacoThemeInjectionToken } from "../monaco-themes";

const ayuMirageMonacoThemeInjectable = getInjectable({
  id: "ayu-mirage-monaco-theme",
  instantiate: () => ({
    name: "ayu-mirage",
    base: "vs-dark" as const,
    inherit: true,
    rules: [
      {
        background: "1f2430",
        foreground: "cccac2",
        token: "",
      },
      {
        fontStyle: "italic",
        foreground: "6e7c8f",
        token: "comment",
      },
      {
        foreground: "d5ff80",
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
        foreground: "dfbfff",
        token: "constant",
      },
      {
        foreground: "dfbfff",
        token: "constant.numeric",
      },
      {
        foreground: "dfbfff",
        token: "constant.language",
      },
      {
        foreground: "ffa659",
        token: "keyword",
      },
      {
        foreground: "f29e74",
        token: "keyword.operator",
      },
      {
        foreground: "ffa659",
        token: "storage",
      },
      {
        foreground: "ffcd66",
        token: "entity.name.function",
      },
      {
        foreground: "ffcd66",
        token: "support.function",
      },
      {
        foreground: "73d0ff",
        token: "entity.name.type",
      },
      {
        foreground: "73d0ff",
        token: "entity.name.class",
      },
      {
        foreground: "5ccfe6",
        token: "entity.name.tag",
      },
      {
        foreground: "f28779",
        token: "entity.other.attribute-name",
      },
      {
        foreground: "f28779",
        token: "variable.other.property",
      },
      {
        foreground: "dfbfff",
        token: "variable.parameter",
      },
      {
        foreground: "73d0ff",
        token: "support.type",
      },
      {
        foreground: "d9be98",
        token: "support.constant",
      },
      {
        background: "ff6666",
        foreground: "1f2430",
        token: "invalid",
      },
    ],
    colors: {
      "editor.foreground": "#cccac2",
      "editor.background": "#1f2430",
      "editor.selectionBackground": "#409fff40",
      "editor.inactiveSelectionBackground": "#409fff21",
      "editor.lineHighlightBackground": "#1a1f29",
      "editor.findMatchBackground": "#736950",
      "editor.findMatchHighlightBackground": "#73695066",
      "editorCursor.foreground": "#ffcc66",
      "editorWhitespace.foreground": "#707a8c80",
      "editorLineNumber.foreground": "#707a8c80",
      "editorLineNumber.activeForeground": "#707a8c",
      "editorIndentGuide.background": "#707a8c3b",
      "editorIndentGuide.activeBackground": "#707a8c70",
    },
  }),
  injectionToken: customMonacoThemeInjectionToken,
});

export default ayuMirageMonacoThemeInjectable;
