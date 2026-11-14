/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import aiToolProvidersInjectable from "../renderer/ai-tool-providers.injectable";
import { getArgumentsFor, getExecutableFor, normalizeAiToolSettings } from "./ai-tools";
import { splitArguments } from "./command";

describe("AI tool provider registry", () => {
  const providers = getDiForUnitTesting().inject(aiToolProvidersInjectable);

  it("registers the supported tools in order, custom last", () => {
    expect(providers.map((provider) => provider.id)).toEqual([
      "claude-code",
      "codex-cli",
      "copilot-cli",
      "gemini-cli",
      "opencode",
      "custom",
    ]);
  });

  it.each(providers.map((provider) => [provider.id, provider] as const))(
    "%s has a usable definition",
    (_id, provider) => {
      expect(provider.name).toBeTruthy();
      expect(provider.iconText.length).toBeGreaterThan(0);
      expect(() => splitArguments(provider.defaultArguments)).not.toThrow();
      expect(provider.defaultArguments).toContain("{prompt}");

      if (provider.id !== "custom") {
        expect(provider.defaultExecutable).toMatch(/^[a-z]+$/);
        expect(provider.installSteps.length).toBeGreaterThan(0);
        expect(provider.installUrl).toMatch(/^https:\/\//);
      }
    },
  );

  it("starts Claude Code in plan mode and Codex in a read-only sandbox", () => {
    expect(providers.find((provider) => provider.id === "claude-code")?.defaultArguments).toBe(
      "--permission-mode plan {prompt}",
    );
    expect(providers.find((provider) => provider.id === "codex-cli")?.defaultArguments).toBe(
      "--sandbox read-only {prompt}",
    );
  });

  it("uses configured paths and arguments over the defaults", () => {
    const claude = providers.find((provider) => provider.id === "claude-code")!;
    const settings = { "claude-code": { executablePath: "/opt/claude", arguments: "{prompt}" } };

    expect(getExecutableFor(claude, settings)).toBe("/opt/claude");
    expect(getArgumentsFor(claude, settings)).toBe("{prompt}");
    expect(getExecutableFor(claude, {})).toBe("claude");
    expect(getArgumentsFor(claude, { "claude-code": { arguments: "" } })).toBe("");
  });
});

describe("normalizeAiToolSettings", () => {
  it("keeps valid settings and drops the rest", () => {
    expect(
      normalizeAiToolSettings({
        a: { executablePath: "  /x  ", arguments: "--y {prompt}" },
        b: { executablePath: "   " },
        c: "nope",
        d: { arguments: 5 },
      }),
    ).toEqual({ a: { executablePath: "/x", arguments: "--y {prompt}" } });
    expect(normalizeAiToolSettings(undefined)).toEqual({});
    expect(normalizeAiToolSettings([1])).toEqual({});
  });
});
