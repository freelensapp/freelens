/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { JsonApiError } from "@freelens/json-api";
import { JsonApi } from "@freelens/json-api";
import type { Response } from "@freelens/node-fetch";
import type { KubeJsonApiData } from "@freelens/kube-object";

export interface KubeJsonApiError extends JsonApiError {
  code: number;
  status: string;
  message?: string;
  reason: string;
  details: {
    name: string;
    kind: string;
  };
}

export class KubeJsonApi extends JsonApi<KubeJsonApiData> {
  protected parseError(error: KubeJsonApiError | string, res: Response): string[] {
    if (typeof error === "string") {
      return [error];
    }

    const { status, reason, message } = error;

    if (status && reason) {
      return [message || `${status}: ${reason}`];
    }

    return super.parseError(error, res);
  }
}
