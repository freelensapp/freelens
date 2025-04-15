/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-details-statuses.scss";
import type { Pod } from "@freelensapp/kube-object";
import countBy from "lodash/countBy";
import kebabCase from "lodash/kebabCase";
import React from "react";

export interface PodDetailsStatusesProps {
  pods: Pod[];
}

export class PodDetailsStatuses extends React.Component<PodDetailsStatusesProps> {
  render() {
    const { pods } = this.props;

    if (!pods.length) return null;
    const statuses = countBy(pods.map((pod) => pod.getStatus()));

    return (
      <div className="PodDetailsStatuses">
        {Object.entries(statuses).map(([phase, count]) => (
          <span key={phase} className={kebabCase(phase)}>
            {`${phase}: ${count}`}
          </span>
        ))}
      </div>
    );
  }
}
