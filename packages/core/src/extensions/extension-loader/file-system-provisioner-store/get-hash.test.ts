/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import getHashInjectable from "./get-hash.injectable";

describe("get-hash", () => {
  // The output names on-disk extension data directories, so it must stay
  // byte-identical to the previous crypto-js SHA256 implementation.
  it("returns the lowercase hex SHA-256 of the input", () => {
    const di = getDiForUnitTesting();
    const getHash = di.inject(getHashInjectable);

    expect(getHash("freelens")).toBe("08fedf2e2ff28237639c54beccc762da1f08e584c9f5c9bd5a625e8bab57dd77");
  });
});
