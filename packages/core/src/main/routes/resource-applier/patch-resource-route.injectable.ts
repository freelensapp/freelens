/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import type { Patch } from "rfc6902";
import { apiPrefix } from "../../../common/vars";
import resourceApplierInjectable from "../../resource-applier/create-resource-applier.injectable";
import { payloadValidatedClusterRoute } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";

interface PatchResourcePayload {
  name: string;
  kind: string;
  patch: Patch;
  ns?: string;
}

const patchResourcePayloadValidator = Joi.object<PatchResourcePayload, true, PatchResourcePayload>({
  name: Joi.string().required(),
  kind: Joi.string().required(),
  ns: Joi.string().optional(),
  patch: Joi.array().allow(
    Joi.object({
      op: Joi.string().required(),
    }).unknown(true),
  ),
});

const patchResourceRouteInjectable = getRouteInjectable({
  id: "patch-resource-route",

  instantiate: (di) =>
    payloadValidatedClusterRoute({
      method: "patch",
      path: `${apiPrefix}/stack`,
      payloadValidator: patchResourcePayloadValidator,
    })(async ({ cluster, payload }) => {
      const resourceApplier = di.inject(resourceApplierInjectable, cluster);

      return {
        response: await resourceApplier.patch(payload.name, payload.kind, payload.patch, payload.ns),
      };
    }),
});

export default patchResourceRouteInjectable;
