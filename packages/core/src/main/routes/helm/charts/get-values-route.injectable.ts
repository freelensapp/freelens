/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiPrefix } from "../../../../common/vars";
import getHelmChartValuesInjectable from "../../../helm/helm-service/get-helm-chart-values.injectable";
import { route } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const getHelmChartRouteValuesInjectable = getRouteInjectable({
  id: "get-helm-chart-values-route",

  instantiate: (di) => {
    const getHelmChartValues = di.inject(getHelmChartValuesInjectable);

    return route({
      method: "get",
      path: `${apiPrefix}/v2/charts/{repo}/{chart}/values`,
    })(async ({ params, query }) => ({
      response: await getHelmChartValues(params.repo, params.chart, query.get("version") ?? undefined),
    }));
  },
});

export default getHelmChartRouteValuesInjectable;
