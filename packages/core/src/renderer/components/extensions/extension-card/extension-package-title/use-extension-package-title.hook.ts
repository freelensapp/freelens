/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface UseExtensionPackageTitleArgs {
  name: string;
}

export interface UseExtensionPackageTitleResult {
  scope: string;
  pkgName: string;
}

const splitName = (name: string): { scope: string; pkgName: string } => {
  const idx = name.indexOf("/");
  if (idx < 0) {
    return { scope: "", pkgName: name };
  }
  return { scope: name.slice(0, idx + 1), pkgName: name.slice(idx + 1) };
};

export const useExtensionPackageTitle = ({ name }: UseExtensionPackageTitleArgs): UseExtensionPackageTitleResult => {
  const { scope, pkgName } = splitName(name);
  return { scope, pkgName };
};
