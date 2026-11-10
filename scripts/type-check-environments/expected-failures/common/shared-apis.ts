/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The globals both environments have, which common code may use. This file
// has to type-check in tsconfig.main.json and in tsconfig.renderer.json alike.

export const id = globalThis.crypto.randomUUID();
export const bytes = new TextEncoder().encode(id);
export const url = new URL("https://freelens.app/");
export const controller = new AbortController();
export const copy = structuredClone({ id });

const timer = setTimeout(() => controller.abort(), 0);

clearTimeout(timer);
