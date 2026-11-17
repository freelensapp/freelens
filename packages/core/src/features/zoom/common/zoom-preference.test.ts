/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import userPreferenceDescriptorsInjectable from "../../user-preferences/common/preference-descriptors.injectable";
import { zoomSteps } from "./zoom-steps";

import type { PreferenceDescriptors } from "../../user-preferences/common/preference-descriptors.injectable";

describe("zoom preference", () => {
  let descriptor: PreferenceDescriptors["zoom"];

  beforeEach(() => {
    descriptor = getDiForUnitTesting().inject(userPreferenceDescriptorsInjectable).zoom;
  });

  it("is 100% when nothing is stored", () => {
    expect(descriptor.fromStore(undefined)).toBe(100);
  });

  it("stores nothing for 100%", () => {
    expect(descriptor.toStore(100)).toBeUndefined();
  });

  it.each(zoomSteps.filter((step) => step !== 100))("keeps %i% across a restart", (step) => {
    expect(descriptor.fromStore(descriptor.toStore(step))).toBe(step);
  });

  it.each([0, 99, 300])("falls back to 100% for a stored %i%, which is not a step", (value) => {
    expect(descriptor.fromStore(value)).toBe(100);
  });

  it("stores nothing for a zoom that is not a step", () => {
    expect(descriptor.toStore(99)).toBeUndefined();
  });
});
