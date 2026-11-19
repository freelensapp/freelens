/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Config from "conf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import persistStateToConfigInjectable from "./persist-state-to-config.injectable";

import type { PersistStateToConfig } from "../common/save-to-file";

describe("persist-state-to-config in main", () => {
  let cwd: string;
  let config: Config<Record<string, unknown>>;
  let persistStateToConfig: PersistStateToConfig;

  const readFile = () => JSON.parse(readFileSync(path.join(cwd, "some-store.json"), "utf8"));

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "persist-state-to-config-"));
    config = new Config<Record<string, unknown>>({ cwd, configName: "some-store", projectName: "test" });
    config.set({ kept: "by the file", activeHotbarId: "old" });
    persistStateToConfig = getDiForUnitTesting().inject(persistStateToConfigInjectable);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("writes the whole state with one set, and keeps the keys the state does not name", () => {
    const set = vi.spyOn(config, "set");

    persistStateToConfig(config, { hotbars: [{ id: "new" }], activeHotbarId: "new" });

    expect(set).toHaveBeenCalledTimes(1);
    expect(readFile()).toEqual({ kept: "by the file", hotbars: [{ id: "new" }], activeHotbarId: "new" });
  });

  it("writes nothing for a state without keys", () => {
    const set = vi.spyOn(config, "set");

    persistStateToConfig(config, {});

    expect(set).not.toHaveBeenCalled();
    expect(readFile()).toEqual({ kept: "by the file", activeHotbarId: "old" });
  });
});
