/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import { apiPrefix } from "../../../../common/vars";
import type { InstallChartArgs } from "../../../helm/helm-service/install-helm-chart.injectable";
import installClusterHelmChartInjectable from "../../../helm/helm-service/install-helm-chart.injectable";
import { payloadValidatedClusterRoute } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const installChartArgsValidator = Joi.object<InstallChartArgs, true, InstallChartArgs>({
  chart: Joi.string().required(),
  values: Joi.object().required().unknown(true),
  name: Joi.string(),
  namespace: Joi.string().required(),
  version: Joi.string().required(),
});

const installChartRouteInjectable = getRouteInjectable({
  id: "install-chart-route",

  instantiate: (di) => {
    const installHelmChart = di.inject(installClusterHelmChartInjectable);

    return payloadValidatedClusterRoute({
      method: "post",
      path: `${apiPrefix}/v2/releases`,
      payloadValidator: installChartArgsValidator,
    })(async ({ payload, cluster }) => ({
      response: await installHelmChart(cluster, payload),
      statusCode: 201,
    }));
  },
});

export default installChartRouteInjectable;
