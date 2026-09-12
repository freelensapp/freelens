/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { debugRequest } from "../test-utils";
import { debugContainerRequestValidator } from "./route.injectable";

describe("debug request validation", () => {
  it("accepts a target and image separately from the pod identity", () => {
    expect(debugContainerRequestValidator.validate({ ...debugRequest, action: "create" }).error).toBeUndefined();
  });

  it.each([
    { namespace: "--namespace=other" },
    { name: "../pod" },
    { uid: "" },
    { containerName: "freelens-debug-../../pid" },
    { image: "alpine --privileged" },
    { targetContainerName: "-c" },
    { command: ["kill", "1"] },
    { privileged: true },
  ])("rejects invalid identifiers and caller-supplied lifecycle commands: %j", (override) => {
    expect(
      debugContainerRequestValidator.validate({ ...debugRequest, action: "create", ...override }).error,
    ).toBeDefined();
  });
});
