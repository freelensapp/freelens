/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isWslPath, matchIgnoredKubeconfigFileName } from "./watch-file-changes.injectable";

describe("matchIgnoredKubeconfigFileName", () => {
  it.each([
    "._config", // macOS specific
    ".#config", // emacs lock file
    ".DS_Store", // macOS specific
    "config.bak", // backup file
    "config.lock", // kubectl lock file
    ".config.swn", // vim swap file
    ".config.swo", // vim swap file
    ".config.swp", // vim swap file
    "config#", // emacs auto save
    "config~", // backup file
    "~config", // backup file
    "cache", // discovery cache
    "desktop.ini", // windows specific
    "kubectx", // kubectx cache
    "kubens", // kubens cache
    "Thumbs.db", // windows specific
  ])("ignores %s", (fileName) => {
    expect(matchIgnoredKubeconfigFileName(fileName)).toBeDefined();
  });

  it.each([
    "config",
    "kubeconfig",
    "config.yaml",
    "config.swq", // not one of the vim swap suffixes
    "backup.bakery", // ".bak" only matches as a suffix
    "cached", // "cache" only matches in full
    "my.DS_Store", // literal names only match in full
  ])("syncs %s", (fileName) => {
    expect(matchIgnoredKubeconfigFileName(fileName)).toBeUndefined();
  });
});

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
