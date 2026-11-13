/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { languages } from "monaco-editor";
import { describe, expect, it, vi } from "vitest";
import registerYamlFoldingRangeProviderInjectable from "./register-yaml-folding-range-provider.injectable";

import type { editor } from "monaco-editor";

describe("registerYamlFoldingRangeProviderInjectable", () => {
  it("registers for YAML a provider that folds a key over its indentless sequence", () => {
    const register = registerYamlFoldingRangeProviderInjectable.instantiate(undefined as never);

    register();

    expect(languages.registerFoldingRangeProvider).toHaveBeenCalledWith("yaml", expect.any(Object));

    const [, provider] = vi.mocked(languages.registerFoldingRangeProvider).mock.calls[0];
    const model = { getLinesContent: () => ["containers:", "- name: one", "  image: busybox"] } as editor.ITextModel;

    expect(provider.provideFoldingRanges(model, {} as never, {} as never)).toEqual([
      { start: 1, end: 3 },
      { start: 2, end: 3 },
    ]);
  });
});
