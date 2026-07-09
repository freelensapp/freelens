/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
export default {
  require: vi.fn(),
  match: vi.fn(),
  app: {
    getVersion: vi.fn().mockReturnValue("3.0.0"),
    getLocale: vi.fn().mockRejectedValue("en"),
    getPath: vi.fn(() => "tmp"),
  },
  dialog: vi.fn(),
  ipcRenderer: {
    on: vi.fn(),
  },
};
