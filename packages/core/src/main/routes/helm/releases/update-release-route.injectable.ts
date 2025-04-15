/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import { apiPrefix } from "../../../../common/vars";
import type { UpdateChartArgs } from "../../../helm/helm-service/update-helm-release.injectable";
import updateHelmReleaseInjectable from "../../../helm/helm-service/update-helm-release.injectable";
import { payloadValidatedClusterRoute } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const updateChartArgsValidator = Joi.object<UpdateChartArgs, true, UpdateChartArgs>({
  chart: Joi.string().required(),
  version: Joi.string().required(),
  values: Joi.string().required(),
});

const updateReleaseRouteInjectable = getRouteInjectable({
  id: "update-release-route",

  instantiate: (di) => {
    const updateRelease = di.inject(updateHelmReleaseInjectable);

    return payloadValidatedClusterRoute({
      method: "put",
      path: `${apiPrefix}/v2/releases/{namespace}/{release}`,
      payloadValidator: updateChartArgsValidator,
    })(async ({ cluster, params, payload }) => ({
      response: await updateRelease(cluster, params.release, params.namespace, payload),
    }));
  },
});

export default updateReleaseRouteInjectable;
