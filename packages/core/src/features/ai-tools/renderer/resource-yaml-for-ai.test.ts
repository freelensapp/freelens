/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { editorYamlForAi, resourceYamlForAi, sanitizeResourceForAi } from "./resource-yaml-for-ai";

describe("resourceYamlForAi", () => {
  it("redacts Secret values before building the prompt", () => {
    const yaml = resourceYamlForAi("Secret", {
      data: { password: "c2VjcmV0" },
      stringData: { token: "secret-token" },
    });

    expect(yaml).toContain("password:");
    expect(yaml).toContain("token:");
    expect(yaml.match(/<redacted>/g)).toHaveLength(2);
    expect(yaml).not.toContain("c2VjcmV0");
    expect(yaml).not.toContain("secret-token");
  });

  it("preserves non-secret resource fields", () => {
    const yaml = resourceYamlForAi("Pod", {
      metadata: { name: "example" },
    });

    expect(yaml).toContain("name: example");
  });

  it("drops managed fields and the last-applied annotation", () => {
    const resource = sanitizeResourceForAi("Deployment", {
      metadata: {
        name: "web",
        managedFields: [{ manager: "kubectl" }],
        annotations: { "kubectl.kubernetes.io/last-applied-configuration": "{...}", team: "shop" },
      },
    });

    expect(resource.metadata).toEqual({ name: "web", annotations: { team: "shop" } });
  });

  it("redacts credential-like environment variables in nested pod templates", () => {
    const resource = sanitizeResourceForAi("Deployment", {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: "web",
                env: [
                  { name: "DB_PASSWORD", value: "hunter2" },
                  { name: "LOG_LEVEL", value: "debug" },
                  { name: "API_TOKEN", valueFrom: { secretKeyRef: { name: "s", key: "k" } } },
                ],
              },
            ],
          },
        },
      },
    });
    const env = (resource.spec as any).template.spec.containers[0].env;

    expect(env).toEqual([
      { name: "DB_PASSWORD", value: "<redacted>" },
      { name: "LOG_LEVEL", value: "debug" },
      { name: "API_TOKEN", valueFrom: { secretKeyRef: { name: "s", key: "k" } } },
    ]);
  });

  it("does not modify the object it is given", () => {
    const original = { kind: "Secret", data: { a: "b" } };

    sanitizeResourceForAi("Secret", original);

    expect(original.data.a).toBe("b");
  });
});

describe("editorYamlForAi", () => {
  it("sanitizes a Secret typed in the editor", () => {
    expect(editorYamlForAi("kind: Secret\ndata:\n  key: c2VjcmV0\n")).not.toContain("c2VjcmV0");
  });

  it("keeps invalid YAML as typed", () => {
    expect(editorYamlForAi("kind: [unclosed")).toBe("kind: [unclosed");
  });
});
