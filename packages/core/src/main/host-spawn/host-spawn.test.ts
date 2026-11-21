/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import hostSpawnInjectable from "./host-spawn.injectable";
import { hostSpawnEnvArgs, hostSpawnForwardedEnvVarNames, sandboxOnlyEnvVarNames } from "./host-spawn-env";

import type { DiContainer } from "@ogre-tools/injectable";

import type { HostSpawn } from "./host-spawn.injectable";

describe("host-spawn environment forwarding", () => {
  describe("hostSpawnForwardedEnvVarNames", () => {
    it("always names TERM and PWD, as host-spawn does by default", () => {
      expect(hostSpawnForwardedEnvVarNames({})).toEqual(["PWD", "TERM"]);
    });

    it("names every defined variable of the environment, sorted", () => {
      const names = hostSpawnForwardedEnvVarNames({
        AWS_PROFILE: "customers",
        KUBECONFIG: "/some-kubeconfig",
        ZEBRA: "last",
        ALPHA: "first",
      });

      expect(names).toEqual(["ALPHA", "AWS_PROFILE", "KUBECONFIG", "PWD", "TERM", "ZEBRA"]);
    });

    it("skips variables without a value", () => {
      const names = hostSpawnForwardedEnvVarNames({
        SOME_UNDEFINED_VAR: undefined,
        AWS_PROFILE: "customers",
      });

      expect(names).toEqual(["AWS_PROFILE", "PWD", "TERM"]);
    });

    it("does not name the sandbox-only variables, whose values would break a host process", () => {
      const names = hostSpawnForwardedEnvVarNames({
        PATH: "/app/bin:/usr/bin",
        HOME: "/home/some-user/.var/app/app.freelens.Freelens",
        LD_LIBRARY_PATH: "/app/lib",
        LD_PRELOAD: "/app/lib/some.so",
        TMPDIR: "/run/user/1000/app/app.freelens.Freelens",
        XDG_DATA_DIRS: "/app/share:/usr/share",
        XDG_CONFIG_DIRS: "/app/etc/xdg:/etc/xdg",
        XDG_DATA_HOME: "/home/some-user/.var/app/app.freelens.Freelens/.local/share",
        XDG_CONFIG_HOME: "/home/some-user/.var/app/app.freelens.Freelens/.config",
        XDG_CACHE_HOME: "/home/some-user/.var/app/app.freelens.Freelens/.cache",
        XDG_RUNTIME_DIR: "/run/user/1000/app/app.freelens.Freelens",
        XDG_STATE_HOME: "/home/some-user/.var/app/app.freelens.Freelens/.local/state",
        FLATPAK_ID: "app.freelens.Freelens",
        FLATPAK_SANDBOX_DIR: "/run/user/1000/flatpak/app.freelens.Freelens",
        AWS_PROFILE: "customers",
      });

      expect(names).toEqual(["AWS_PROFILE", "PWD", "TERM"]);
      expect(names.some((name) => sandboxOnlyEnvVarNames.has(name))).toBe(false);
    });

    it("keeps the names of credential plugin variables such as AWS_PROFILE", () => {
      const names = hostSpawnForwardedEnvVarNames({
        AWS_PROFILE: "customers",
        AWS_ACCESS_KEY_ID: "some-access-key",
        AWS_SECRET_ACCESS_KEY: "some-secret-key",
        KUBERNETES_EXEC_INFO: '{"apiVersion":"client.authentication.k8s.io/v1"}',
      });

      expect(names).toContain("AWS_PROFILE");
      expect(names).toContain("AWS_ACCESS_KEY_ID");
      expect(names).toContain("AWS_SECRET_ACCESS_KEY");
      expect(names).toContain("KUBERNETES_EXEC_INFO");
    });

    it("builds the -env argument as a comma-separated list", () => {
      expect(hostSpawnEnvArgs({ AWS_PROFILE: "customers" })).toEqual(["-env", "AWS_PROFILE,PWD,TERM"]);
    });
  });

  describe("hostSpawn injectable", () => {
    let di: DiContainer;
    let hostSpawn: HostSpawn;

    beforeEach(() => {
      di = getDiForUnitTesting();

      vi.stubEnv("PATH", "/app/bin:/usr/bin");
      vi.stubEnv("HOME", "/home/some-user/.var/app/app.freelens.Freelens");
      vi.stubEnv("TERM", "xterm-256color");
      vi.stubEnv("SOME_PROCESS_VAR", "some-process-value");
      vi.stubEnv("AWS_PROFILE", "from-process-env");

      hostSpawn = di.inject(hostSpawnInjectable);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    describe("isHostSpawn", () => {
      it("recognizes the Flatpak host-spawn helper by its path", () => {
        expect(hostSpawn.isHostSpawn("/app/bin/host-spawn")).toBe(true);
      });

      it("recognizes host-spawn by its basename, wherever it is", () => {
        expect(hostSpawn.isHostSpawn("/usr/local/bin/host-spawn")).toBe(true);
      });

      it("does not recognize an ordinary shell", () => {
        expect(hostSpawn.isHostSpawn("/bin/bash")).toBe(false);
        expect(hostSpawn.isHostSpawn("/usr/bin/zsh")).toBe(false);
        expect(hostSpawn.isHostSpawn("powershell.exe")).toBe(false);
      });
    });

    describe("spawnOptionsFor", () => {
      it("leaves the arguments and environment of an ordinary file unchanged", () => {
        const env = { PATH: "/usr/bin", AWS_PROFILE: "customers" };
        const options = hostSpawn.spawnOptionsFor("/bin/bash", ["--login"], env);

        expect(options.args).toEqual(["--login"]);
        expect(options.env).toEqual(env);
        expect(options.env).not.toHaveProperty("SOME_PROCESS_VAR");
      });

      it("prepends the -env option naming the forwarded variables to the arguments of host-spawn", () => {
        const options = hostSpawn.spawnOptionsFor("/app/bin/host-spawn", ["--login"], {
          AWS_PROFILE: "customers",
          KUBECONFIG: "/some-proxy-kubeconfig",
          PATH: "/app/bin:/usr/bin",
        });

        expect(options.args[0]).toBe("-env");
        expect(options.args[1].split(",")).toEqual(
          expect.arrayContaining(["AWS_PROFILE", "KUBECONFIG", "PWD", "TERM"]),
        );
        expect(options.args[1].split(",")).not.toContain("PATH");
        expect(options.args.slice(2)).toEqual(["--login"]);
      });

      it("passes process.env into the spawn options, so host-spawn can read the value of every forwarded name", () => {
        const options = hostSpawn.spawnOptionsFor("/app/bin/host-spawn", [], {
          KUBECONFIG: "/some-proxy-kubeconfig",
        });

        expect(options.env.SOME_PROCESS_VAR).toBe("some-process-value");
        expect(options.env.TERM).toBe("xterm-256color");
        expect(options.env.PATH).toBe("/app/bin:/usr/bin");
        expect(options.env.KUBECONFIG).toBe("/some-proxy-kubeconfig");
      });

      it("lets a custom environment override process.env, also in the forwarded values", () => {
        const options = hostSpawn.spawnOptionsFor("/app/bin/host-spawn", [], {
          AWS_PROFILE: "customers",
        });

        // The value of the forwarded AWS_PROFILE is the custom one, not the
        // one of process.env.
        expect(options.env.AWS_PROFILE).toBe("customers");
        expect(options.args[1].split(",")).toContain("AWS_PROFILE");
      });

      it("forwards variables that only exist in the given environment", () => {
        const options = hostSpawn.spawnOptionsFor("/app/bin/host-spawn", [], {
          GRANTED_VAULT: "some-vault",
          FREELENS_PROXY_TOKEN: "some-token",
        });

        const names = options.args[1].split(",");

        expect(names).toContain("GRANTED_VAULT");
        expect(names).toContain("FREELENS_PROXY_TOKEN");
        expect(options.env.GRANTED_VAULT).toBe("some-vault");
        expect(options.env.FREELENS_PROXY_TOKEN).toBe("some-token");
      });
    });
  });
});
