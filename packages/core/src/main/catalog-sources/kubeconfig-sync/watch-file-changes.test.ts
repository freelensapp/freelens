/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isWslPath } from "./watch-file-changes.injectable";

describe("isWslPath", () => {
  it.each([
    "\\\\wsl.localhost\\Ubuntu\\home\\user\\.kube\\config",
    "\\\\wsl$\\Ubuntu\\home\\user\\.kube\\config",
    "\\\\WSL.LOCALHOST\\Ubuntu\\home\\user\\.kube\\config",
    "\\\\WSL$\\Ubuntu\\home\\user\\.kube\\config",
  ])("returns true for WSL 9p share path: %s", (filePath) => {
    expect(isWslPath(filePath)).toBe(true);
  });

  it.each([
    "C:\\Users\\user\\.kube\\config",
    "/home/user/.kube/config",
    "\\\\server\\share\\.kube\\config",
    "\\\\wslfoo\\Ubuntu\\.kube\\config",
    "wsl.localhost\\Ubuntu\\.kube\\config",
  ])("returns false for non-WSL path: %s", (filePath) => {
    expect(isWslPath(filePath)).toBe(false);
  });
});
