/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Joi from "joi";
import { apiPrefix } from "../../../../common/vars";
import rollbackClusterHelmReleaseInjectable from "../../../helm/helm-service/rollback-helm-release.injectable";
import { payloadValidatedClusterRoute } from "../../../router/route";
import { getRouteInjectable } from "../../../router/router.injectable";

interface RollbackReleasePayload {
  revision: number;
}

const rollbackReleasePayloadValidator = Joi.object<RollbackReleasePayload, true, RollbackReleasePayload>({
  revision: Joi.number().required(),
});

const rollbackReleaseRouteInjectable = getRouteInjectable({
  id: "rollback-release-route",

  instantiate: (di) => {
    const rollbackRelease = di.inject(rollbackClusterHelmReleaseInjectable);

    return payloadValidatedClusterRoute({
      method: "put",
      path: `${apiPrefix}/v2/releases/{namespace}/{name}/rollback`,
      payloadValidator: rollbackReleasePayloadValidator,
    })(async ({ cluster, params, payload }) => {
      await rollbackRelease(cluster, { ...params, ...payload });
    });
  },
});

export default rollbackReleaseRouteInjectable;
