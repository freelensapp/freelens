/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// monaco-editor has no resolvable package entry under Node (only an ESM
// "module" field pointing into esm/), so it can be neither externalized nor
// automocked by Vitest; this manual mock provides the members the application
// code touches at runtime. The MonacoEditor React component itself is mocked
// separately in src/renderer/components/monaco-editor/__mocks__/.

export const editor = {
  create: vi.fn(),
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
  getModel: vi.fn(),
  getModels: vi.fn(() => []),
  createModel: vi.fn(),
  remeasureFonts: vi.fn(),
};

export const Uri = {
  file: vi.fn((path: string) => ({ path })),
  parse: vi.fn((value: string) => ({ path: value })),
};

export const languages = {
  register: vi.fn(),
  registerCompletionItemProvider: vi.fn(),
};
