/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import fsInjectable from "./fs.injectable";
import writeJsonFileInjectable from "./write-json-file.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("writing a JSON file", () => {
  let di: DiContainer;

  const modeOf = async (path: string) => (await di.inject(fsInjectable).stat(path)).mode & 0o777;

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  it("creates the file and its directory readable by the user only", async () => {
    await di.inject(writeJsonFileInjectable)("/some-directory/some-file.json", { some: "content" });

    expect(await modeOf("/some-directory/some-file.json")).toBe(0o600);
    expect(await modeOf("/some-directory")).toBe(0o700);
  });

  it("makes a file it writes over readable by the user only", async () => {
    const fs = di.inject(fsInjectable);

    await fs.ensureDir("/some-directory");
    await fs.writeFile("/some-directory/some-file.json", "{}", { mode: 0o644 });
    await di.inject(writeJsonFileInjectable)("/some-directory/some-file.json", { some: "content" });

    expect(await modeOf("/some-directory/some-file.json")).toBe(0o600);
    expect(await fs.readJson("/some-directory/some-file.json")).toEqual({ some: "content" });
  });
});
