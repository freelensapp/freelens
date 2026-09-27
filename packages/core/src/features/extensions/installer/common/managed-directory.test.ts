/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { managedDirectoryOf } from "./managed-directory";

const root = "/user-data/extensions";

describe("managedDirectoryOf", () => {
  it("is the directory holding every build of one extension", () => {
    expect(managedDirectoryOf(root, `${root}/my-extension/1.0.0-0f1e2d3c`)).toBe(`${root}/my-extension`);
  });

  it("is the directory itself for an unpacked extension placed straight into the root", () => {
    expect(managedDirectoryOf(root, `${root}/my-extension`)).toBe(`${root}/my-extension`);
  });

  it("is nothing for a path outside the root, which must never be deleted", () => {
    expect(managedDirectoryOf(root, "/home/someone/src/my-extension")).toBeUndefined();
  });

  it("is nothing for the root itself", () => {
    expect(managedDirectoryOf(root, root)).toBeUndefined();
  });

  it("is not fooled by a sibling directory sharing the root's prefix", () => {
    expect(managedDirectoryOf(root, "/user-data/extensions-backup/my-extension")).toBeUndefined();
  });

  it("is not fooled by a path escaping through the root", () => {
    expect(managedDirectoryOf(root, `${root}/../../etc/passwd`)).toBeUndefined();
  });
});
