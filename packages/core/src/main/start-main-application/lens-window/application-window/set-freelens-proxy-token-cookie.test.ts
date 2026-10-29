/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import freelensProxyPortInjectable from "../../../freelens-proxy/freelens-proxy-port.injectable";
import freelensProxyTokenInjectable from "../../../freelens-proxy/freelens-proxy-token.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import setFreelensProxyTokenCookieInjectable from "./set-freelens-proxy-token-cookie.injectable";

import type { Session } from "electron";

describe("set-freelens-proxy-token-cookie", () => {
  let set: ReturnType<typeof vi.fn>;
  let session: Session;
  let token: string;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(freelensProxyPortInjectable, () => ({ get: () => 56789, set: () => {} }));

    token = di.inject(freelensProxyTokenInjectable).value;
    set = vi.fn().mockResolvedValue(undefined);
    session = { cookies: { set } } as unknown as Session;

    const setCookie = di.inject(setFreelensProxyTokenCookieInjectable);

    return setCookie(session);
  });

  it("sets a secure, http-only, strict cookie for the renderer domain", () => {
    expect(set).toHaveBeenCalledWith({
      url: "https://renderer.freelens.app:56789",
      domain: ".renderer.freelens.app",
      name: "freelens_proxy_token",
      value: token,
      secure: true,
      httpOnly: true,
      sameSite: "strict",
    });
  });
});
