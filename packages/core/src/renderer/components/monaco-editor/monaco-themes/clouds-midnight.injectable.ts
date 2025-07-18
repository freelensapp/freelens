/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { customMonacoThemeInjectionToken } from "../monaco-themes";

const cloudsMidnightThemeInjectable = getInjectable({
  id: "clouds-midnight-theme",
  instantiate: () => ({
    name: "clouds-midnight",
    base: "vs-dark" as const,
    inherit: true,
    rules: [
      {
        background: "191919",
        token: "",
      },
      {
        foreground: "3c403b",
        token: "comment",
      },
      {
        foreground: "5d90cd",
        token: "string",
      },
      {
        foreground: "46a609",
        token: "constant.numeric",
      },
      {
        foreground: "39946a",
        token: "constant.language",
      },
      {
        foreground: "927c5d",
        token: "keyword",
      },
      {
        foreground: "927c5d",
        token: "support.constant.property-value",
      },
      {
        foreground: "927c5d",
        token: "constant.other.color",
      },
      {
        foreground: "366f1a",
        token: "keyword.other.unit",
      },
      {
        foreground: "a46763",
        token: "entity.other.attribute-name.html",
      },
      {
        foreground: "4b4b4b",
        token: "keyword.operator",
      },
      {
        foreground: "e92e2e",
        token: "storage",
      },
      {
        foreground: "858585",
        token: "entity.other.inherited-class",
      },
      {
        foreground: "606060",
        token: "entity.name.tag",
      },
      {
        foreground: "a165ac",
        token: "constant.character.entity",
      },
      {
        foreground: "a165ac",
        token: "support.class.js",
      },
      {
        foreground: "606060",
        token: "entity.other.attribute-name",
      },
      {
        foreground: "e92e2e",
        token: "meta.selector.css",
      },
      {
        foreground: "e92e2e",
        token: "entity.name.tag.css",
      },
      {
        foreground: "e92e2e",
        token: "entity.other.attribute-name.id.css",
      },
      {
        foreground: "e92e2e",
        token: "entity.other.attribute-name.class.css",
      },
      {
        foreground: "616161",
        token: "meta.property-name.css",
      },
      {
        foreground: "e92e2e",
        token: "support.function",
      },
      {
        foreground: "ffffff",
        background: "e92e2e",
        token: "invalid",
      },
      {
        foreground: "e92e2e",
        token: "punctuation.section.embedded",
      },
      {
        foreground: "606060",
        token: "punctuation.definition.tag",
      },
      {
        foreground: "a165ac",
        token: "constant.other.color.rgb-value.css",
      },
      {
        foreground: "a165ac",
        token: "support.constant.property-value.css",
      },
    ],
    colors: {
      "editor.foreground": "#929292",
      "editor.background": "#191919",
      "editor.selectionBackground": "#000000",
      "editor.lineHighlightBackground": "#D7D7D708",
      "editorCursor.foreground": "#7DA5DC",
      "editorWhitespace.foreground": "#BFBFBF",
    },
  }),
  injectionToken: customMonacoThemeInjectionToken,
});

export default cloudsMidnightThemeInjectable;
