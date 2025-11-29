/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { executeOnClusterChannel } from "../channels";

describe("executeOnClusterChannel", () => {
  it("is defined with correct channel id", () => {
    expect(executeOnClusterChannel).toBeDefined();
    expect((executeOnClusterChannel as { id: string }).id).toBe("execute-on-cluster");
  });
});
