/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import freelensProxyPortInjectable from "../../../freelens-proxy/freelens-proxy-port.injectable";
import { freelensProxyTokenCookie } from "../../../freelens-proxy/freelens-proxy-token";
import freelensProxyTokenInjectable from "../../../freelens-proxy/freelens-proxy-token.injectable";

import type { Session } from "electron";

export type SetFreelensProxyTokenCookie = (session: Session) => Promise<void>;

/**
 * Sets the freelens-proxy token as a cookie on the window's session, before the
 * window loads, so that the cluster frames carry it on every request they make
 * to freelens-proxy: a frame's own fetches, its module loads and its
 * WebSockets, none of which a browser lets renderer code add a header to.
 *
 * The cookie is for `.renderer.freelens.app`, the domain of the root frame and
 * of every cluster frame; it is independent of the port, and is `Secure`,
 * `HttpOnly` and `SameSite=Strict`.
 */
const setFreelensProxyTokenCookieInjectable = getInjectable({
  id: "set-freelens-proxy-token-cookie",
  instantiate: (di): SetFreelensProxyTokenCookie => {
    const token = di.inject(freelensProxyTokenInjectable);
    const freelensProxyPort = di.inject(freelensProxyPortInjectable);

    return (session) =>
      session.cookies.set({
        url: `https://renderer.freelens.app:${freelensProxyPort.get()}`,
        domain: ".renderer.freelens.app",
        name: freelensProxyTokenCookie,
        value: token.value,
        secure: true,
        httpOnly: true,
        sameSite: "strict",
      });
  },
});

export default setFreelensProxyTokenCookieInjectable;
