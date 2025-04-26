/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { apiPrefix } from "../../../../common/vars";
import getHelmChartReadmeInjectable from "../../../helm/helm-service/get-helm-chart-readme.injectable";
import { route } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

const getHelmChartReadmeRouteInjectable = getRouteInjectable({
  id: "get-helm-chart-readme-route",

  instantiate: (di) => {
    const getHelmChartReadme = di.inject(getHelmChartReadmeInjectable);

    return route({
      method: "get",
      path: `${apiPrefix}/v2/charts/{repo}/{chart}/readme`,
    })(async ({ params, query }) => {
      const { repo, chart } = params;

      return {
        response: await getHelmChartReadme(repo, chart, query.get("version") ?? undefined),
      };
    });
  },
});

export default getHelmChartReadmeRouteInjectable;
