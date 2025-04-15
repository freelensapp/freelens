/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import { apiPrefix } from "../../../common/vars";
import resourceApplierInjectable from "../../resource-applier/create-resource-applier.injectable";
import { payloadValidatedClusterRoute } from "../../router/route";
import { getRouteInjectable } from "../../router/router.injectable";

const createResourceRouteInjectable = getRouteInjectable({
  id: "create-resource-route",

  instantiate: (di) =>
    payloadValidatedClusterRoute({
      method: "post",
      path: `${apiPrefix}/stack`,
      payloadValidator: Joi.string(),
    })(async ({ cluster, payload }) => {
      const resourceApplier = di.inject(resourceApplierInjectable, cluster);

      return {
        response: await resourceApplier.create(payload),
      };
    }),
});

export default createResourceRouteInjectable;
