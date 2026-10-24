/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface Credentials {
  get(extensionId: string, key: string): Promise<string | undefined>;
  set(extensionId: string, key: string, value: string): Promise<void>;
  delete(extensionId: string, key: string): Promise<void>;
  list(extensionId: string): Promise<string[]>;
}

export type CredentialRequest = { extensionId: string; scope: string } & (
  | { operation: "get" | "delete"; key: string }
  | { operation: "set"; key: string; value: string }
  | { operation: "list" }
);

export interface CredentialResponse {
  value?: string;
  keys?: string[];
}

export type RequestCredentials = (request: CredentialRequest) => Promise<CredentialResponse>;

// Package names may contain one slash (for npm scopes); keys must not contain any.
export function assertCredentialScope(scope: unknown): asserts scope is string {
  if (
    typeof scope !== "string" ||
    scope !== scope.trim() ||
    !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(scope)
  ) {
    throw new Error("Invalid credential scope: use an extension package name.");
  }
}

export function assertCredentialKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || !key.length || /[/\\\x00-\x1f\x7f]/.test(key)) {
    throw new Error("Invalid credential key: use a non-empty name without slashes or control characters.");
  }
}
