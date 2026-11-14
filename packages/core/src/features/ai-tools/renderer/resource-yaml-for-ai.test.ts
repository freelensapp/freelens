/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { resourceYamlForAi } from "./resource-yaml-for-ai";

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
});
