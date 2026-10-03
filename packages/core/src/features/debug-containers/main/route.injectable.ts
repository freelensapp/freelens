/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import { apiPrefix } from "../../../common/vars";
import { payloadValidatedClusterRoute } from "../../../main/router/route";
import { getRouteInjectable } from "../../../main/router/router.injectable";
import { debugContainerNamePattern } from "../common/debug-container";
import debugContainersInjectable from "./debug-containers.injectable";

import type { CreateDebugContainer, DebugContainerReference } from "../common/debug-container";

type Request =
  | { action: "permissions"; namespace: string }
  | (CreateDebugContainer & { action: "create" })
  | (DebugContainerReference & { action: "stop" });

const namespace = Joi.string()
  .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
  .max(63)
  .required();
const reference = {
  namespace,
  name: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/)
    .max(253)
    .required(),
  uid: Joi.string().max(128).required(),
  containerName: Joi.string().pattern(debugContainerNamePattern).max(63).required(),
};

export const debugContainerRequestValidator = Joi.alternatives<Request>().try(
  Joi.object({ action: Joi.valid("permissions").required(), namespace }),
  Joi.object({ action: Joi.valid("stop").required(), ...reference }),
  Joi.object({
    action: Joi.valid("create").required(),
    ...reference,
    image: Joi.string().pattern(/^\S+$/).max(1024).required(),
    targetContainerName: Joi.string()
      .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
      .max(63)
      .required(),
  }),
);

const debugContainerRouteInjectable = getRouteInjectable({
  id: "debug-container-route",
  instantiate: (di) =>
    payloadValidatedClusterRoute({
      method: "post",
      path: `${apiPrefix}/debug-containers`,
      payloadValidator: debugContainerRequestValidator,
    })(async ({ cluster, payload }) => {
      const service = di.inject(debugContainersInjectable, cluster);

      try {
        if (payload.action === "permissions") return { response: await service.permissions(payload.namespace) };
        if (payload.action === "create") await service.create(payload);
        else await service.stop(payload);
        return { response: {} };
      } catch (error) {
        const failure = error as { message?: string; code?: number } | undefined;

        return {
          statusCode: failure?.code && failure.code >= 400 && failure.code < 600 ? failure.code : 400,
          error: { message: failure?.message ?? String(error) },
        };
      }
    }),
});

export default debugContainerRouteInjectable;
