/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SingleOrMany } from "./types";

export interface Disposer {
  (): void;
}

export interface Disposable {
  dispose(): void;
}

export interface ExtendableDisposer extends Disposer {
  push(...values: (Disposer | ExtendableDisposer | Disposable)[]): void;
}

export function disposer(...items: SingleOrMany<Disposer | Disposable | undefined | null>[]): ExtendableDisposer {
  return Object.assign(
    () => {
      for (const item of items.flat()) {
        if (!item) {
          continue;
        }

        if (typeof item === "function") {
          item();
        } else {
          item.dispose();
        }
      }
      items.length = 0;
    },
    {
      push: (...newItems) => items.push(...newItems),
    } as Pick<ExtendableDisposer, "push">,
  );
}
