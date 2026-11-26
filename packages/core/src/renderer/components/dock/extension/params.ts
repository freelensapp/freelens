/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isPlainObject } from "es-toolkit/compat";

import type { ReadonlyDockTabParams } from "./dock-tab-registration";

type DockTabParamSnapshot = ReadonlyDockTabParams[string];

export interface ExtensionDockTabData {
  version: 1;
  extensionName: string;
  typeId: string;
  params: ReadonlyDockTabParams;
}

export function readExtensionDockTabData(value: unknown): ExtensionDockTabData | undefined {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (!isPlainObject(value)) return undefined;

  const data = value as Partial<ExtensionDockTabData>;

  if (
    data.version !== 1 ||
    typeof data.extensionName !== "string" ||
    !data.extensionName.trim() ||
    typeof data.typeId !== "string" ||
    !data.typeId.trim()
  )
    return undefined;

  try {
    return {
      version: 1,
      extensionName: data.extensionName,
      typeId: data.typeId,
      params: copyDockTabParams(data.params),
    };
  } catch {
    return undefined;
  }
}

// Keep the payload opaque to StorageHelper's MobX-to-JS cloning. It assigns
// object keys directly, which loses own "__proto__" properties.
export function writeExtensionDockTabData(data: ExtensionDockTabData): string {
  return JSON.stringify(data);
}

export function migrateLegacyExtensionDockTabData(value: object): string | null {
  try {
    // Preserve own keys before storage clones the object. Version-specific
    // validation stays in the reader so future versions survive migration.
    return JSON.stringify(copyDockTabParams(value));
  } catch {
    // Keep the tab with an invalid descriptor instead of coercing bad values.
    return null;
  }
}

/** Reject values JSON would silently change and return an immutable snapshot. */
export function copyDockTabParams(params: unknown): ReadonlyDockTabParams {
  const ancestors = new Set<object>();

  const copy = (value: unknown): DockTabParamSnapshot => {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "object" || (!Array.isArray(value) && !isPlainObject(value)) || ancestors.has(value)) {
      throw new Error("Dock tab parameters must contain only finite JSON values without cycles");
    }

    ancestors.add(value);

    const result = Array.isArray(value)
      ? Array.from(value, copy)
      : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));

    ancestors.delete(value);

    return Object.freeze(result);
  };

  if (!isPlainObject(params)) {
    throw new Error("Dock tab parameters must be a JSON object");
  }

  return copy(params) as ReadonlyDockTabParams;
}
