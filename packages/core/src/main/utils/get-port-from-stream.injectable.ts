/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { namedCaptures } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import type { Readable } from "node:stream";

export interface GetPortFromStreamArgs {
  /**
   * Should be case insensitive
   * Must have a named matching group called `address`
   */
  lineRegex: RegExp;
  /**
   * Called when the port is found
   */
  onFind?: () => void;
  /**
   * Timeout for how long to wait for the port.
   * Default: 15s
   */
  timeout?: number;
}

export type GetPortFromStream = (stream: Readable, args: GetPortFromStreamArgs) => Promise<number>;

const getPortFromStreamInjectable = getInjectable({
  id: "get-port-from-stream",
  instantiate: (di): GetPortFromStream => {
    const logger = di.inject(loggerInjectionToken);

    return (stream, args) => {
      const logLines: string[] = [];

      return new Promise<number>((resolve, reject) => {
        const handler = (data: unknown) => {
          const logItem = String(data);
          const match = namedCaptures<{ address?: string }>(args.lineRegex, logItem);

          logLines.push(logItem);

          if (match) {
            // use unknown protocol so that there is no default port
            const addr = new URL(`s://${match.address?.trim()}`);

            args.onFind?.();
            stream.off("data", handler);
            clearTimeout(timeoutID);
            resolve(+addr.port);
          }
        };
        const timeoutID = setTimeout(() => {
          stream.off("data", handler);
          logger.warn(`[getPortFrom]: failed to retrieve port via ${args.lineRegex.source}`, logLines);
          reject(new Error("failed to retrieve port from stream"));
        }, args.timeout ?? 15000);

        stream.on("data", handler);
      });
    };
  },
});

export default getPortFromStreamInjectable;
