/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import randomBytesInjectable from "../../../common/utils/random-bytes.injectable";
import { tokenMatches } from "../../../main/freelens-proxy/freelens-proxy-token";
import freelensProxyTokenInjectable from "../../../main/freelens-proxy/freelens-proxy-token.injectable";

export interface AiSession {
  readonly id: string;
  /** Presented to the ProLens proxy instead of its own token. 32 bytes as hex. */
  readonly token: string;
  readonly providerName: string;
  /** The only cluster the session may reach. */
  readonly clusterId: string;
  readonly expiresAt: number;
}

export interface AiSessions {
  issue: (args: { providerName: string; clusterId: string }) => AiSession;
  /** The live session `candidate` is the token of, compared in constant time. */
  find: (candidate: string | undefined) => AiSession | undefined;
  revoke: (id: string) => void;
}

/** A session outlives any single conversation, but not the working day. */
export const aiSessionLifetime = 12 * 60 * 60 * 1000;

/**
 * The AI sessions of this run, in memory only: a restart revokes them all.
 */
const aiSessionsInjectable = getInjectable({
  id: "ai-sessions",
  instantiate: (di): AiSessions => {
    const randomBytes = di.inject(randomBytesInjectable);
    const proxyToken = di.inject(freelensProxyTokenInjectable);
    const sessions = new Map<string, AiSession>();

    const newToken = () => {
      const token = randomBytes(32).toString("hex");

      // A session token that were the proxy's own would carry its full rights.
      if (proxyToken.matches(token)) {
        throw new Error("Could not create an AI session token distinct from the proxy token");
      }

      return token;
    };

    const removeExpired = () => {
      const now = Date.now();

      for (const [id, session] of sessions) {
        if (session.expiresAt <= now) {
          sessions.delete(id);
        }
      }
    };

    return {
      issue: ({ providerName, clusterId }) => {
        removeExpired();

        const session: AiSession = {
          id: randomBytes(8).toString("hex"),
          token: newToken(),
          providerName,
          clusterId,
          expiresAt: Date.now() + aiSessionLifetime,
        };

        sessions.set(session.id, session);

        return session;
      },
      find: (candidate) => {
        if (!candidate) {
          return undefined;
        }

        removeExpired();

        let found: AiSession | undefined;

        // Every live session is compared, so the time taken does not reveal
        // which token was close.
        for (const session of sessions.values()) {
          if (tokenMatches(session.token, candidate)) {
            found = session;
          }
        }

        return found;
      },
      revoke: (id) => {
        sessions.delete(id);
      },
    };
  },
});

export default aiSessionsInjectable;
