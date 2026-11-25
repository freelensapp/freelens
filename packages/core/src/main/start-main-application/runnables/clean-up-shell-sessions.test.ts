/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import shellSessionProcessesInjectable from "../../shell-session/processes.injectable";
import cleanUpShellSessionsInjectable from "./clean-up-shell-sessions.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockInstance } from "vitest";

describe("cleaning up the shell sessions on quit", () => {
  let di: DiContainer;
  let kill: MockInstance<typeof process.kill>;

  const ptyWithPid = (pid: number) => ({ pid }) as Partial<IPty> as IPty;

  beforeEach(() => {
    di = getDiForUnitTesting();
    kill = vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(() => {
    kill.mockRestore();
  });

  it("kills every shell by the pid node-pty reports when the application quits", () => {
    const processes = di.inject(shellSessionProcessesInjectable);
    const pty = { pid: 0 } as { pid: number };

    processes.set("standalone:some-tab", pty as Partial<IPty> as IPty);
    processes.set("some-cluster-id:some-tab", ptyWithPid(1234));

    // On Windows node-pty fills the pid in only once ConPTY has connected.
    pty.pid = 5678;

    di.inject(cleanUpShellSessionsInjectable).run();

    expect(kill.mock.calls).toEqual([[5678], [1234]]);
    expect(processes.size).toBe(0);
  });

  it("skips a shell whose pid node-pty does not know yet, rather than killing pid 0", () => {
    const processes = di.inject(shellSessionProcessesInjectable);

    processes.set("standalone:some-tab", ptyWithPid(0));
    processes.set("some-cluster-id:some-tab", ptyWithPid(1234));

    di.inject(cleanUpShellSessionsInjectable).run();

    expect(kill.mock.calls).toEqual([[1234]]);
    expect(processes.size).toBe(0);
  });
});
