/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";

import type { IComputedValue } from "mobx";

export const computedOr = (...values: IComputedValue<boolean>[]) => computed(() => values.some((value) => value.get()));

export const computedAnd = (...values: IComputedValue<boolean>[]) =>
  computed(() => values.every((value) => value.get()));
