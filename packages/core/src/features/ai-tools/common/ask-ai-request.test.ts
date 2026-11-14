/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import {
  aiSafetyInstructions,
  buildAiPrompt,
  defaultPresetFor,
  presetsFor,
  redactSensitiveText,
  truncate,
} from "./ask-ai-request";

import type { AskAiTarget } from "./ask-ai-request";

const pod: AskAiTarget = {
  type: "resource",
  resource: { kind: "Pod", apiVersion: "v1", name: "web-1", namespace: "shop" },
};

describe("Ask AI presets", () => {
  it("offers the pod questions for a pod", () => {
    expect(presetsFor(pod).map((preset) => preset.id)).toEqual([
      "pod-crash",
      "explain-config",
      "scheduling",
      "analyze-events",
      "resource-limits",
      "network",
    ]);
  });

  it("offers cluster questions for the cluster", () => {
    expect(presetsFor({ type: "cluster" }).map((preset) => preset.id)).toEqual([
      "scheduling",
      "analyze-events",
      "network",
      "cluster-health",
    ]);
  });

  it("preselects the requested preset when it applies", () => {
    expect(defaultPresetFor(pod, "resource-limits")?.id).toBe("resource-limits");
    expect(defaultPresetFor(pod, "cluster-health")?.id).toBe("pod-crash");
  });

  it("names the resource in the question", () => {
    expect(defaultPresetFor(pod)?.question(pod)).toContain("Pod shop/web-1");
  });
});

describe("buildAiPrompt", () => {
  const prompt = buildAiPrompt({
    question: "Why is it crashing?",
    clusterName: "prod-eu",
    contextName: "arn:aws:eks:prod-eu",
    target: pod,
    sections: [
      { title: "Manifest", body: "kind: Pod\npassword: hunter22", language: "yaml" },
      { title: "Empty", body: "   " },
    ],
  });

  it("starts with the read-only safety instructions", () => {
    expect(prompt.startsWith(aiSafetyInstructions)).toBe(true);
    expect(prompt).toContain("Do NOT run commands that change the cluster");
  });

  it("carries the cluster, namespace and resource", () => {
    expect(prompt).toContain("- Cluster: prod-eu");
    expect(prompt).toContain("- kubeconfig context: arn:aws:eks:prod-eu");
    expect(prompt).toContain("- Resource: Pod (v1) web-1");
    expect(prompt).toContain("- Namespace: shop");
  });

  it("fences sections, redacts them, and skips empty ones", () => {
    expect(prompt).toContain("### Manifest\n```yaml\nkind: Pod\npassword: <redacted>\n```");
    expect(prompt).not.toContain("hunter22");
    expect(prompt).not.toContain("### Empty");
  });

  it("uses a longer fence when the body contains one", () => {
    const withFence = buildAiPrompt({
      question: "q",
      target: { type: "cluster" },
      sections: [{ title: "Logs", body: "```\ninjected\n```" }],
    });

    expect(withFence).toContain("````text\n```\ninjected\n```\n````");
  });
});

describe("redactSensitiveText", () => {
  it.each([
    ["Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123", "Authorization: Bearer <redacted>"],
    ["token=s3cr3t-value-123", "token=<redacted>"],
    ['"apiKey": "sk-proj-abcdefghijklmnopqrstuvwx"', '"apiKey": "<redacted>"'],
    ["key AKIAABCDEFGHIJKLMNOP used", "key <redacted> used"],
    ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U", "<redacted>"],
    ["-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----", "<redacted>"],
  ])("redacts %s", (input, expected) => {
    expect(redactSensitiveText(input)).toBe(expected);
  });

  it("leaves ordinary diagnostics alone", () => {
    const text = "Back-off restarting failed container web in pod web-1 (exit code 137, OOMKilled)";

    expect(redactSensitiveText(text)).toBe(text);
  });
});

describe("truncate", () => {
  it("marks what it cut", () => {
    expect(truncate("abcdef", 3)).toBe("abc\n… [truncated by ProLens: 3 more characters]");
    expect(truncate("abc", 3)).toBe("abc");
  });
});
