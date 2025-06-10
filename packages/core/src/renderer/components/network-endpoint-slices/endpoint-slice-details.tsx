/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./endpoint-slice-details.scss";

import { EndpointSlice } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface EndpointSliceDetailsProps extends KubeObjectDetailsProps<EndpointSlice> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedEndpointSliceDetails extends React.Component<EndpointSliceDetailsProps & Dependencies> {
  render() {
    const { object: endpointSlice } = this.props;

    if (!endpointSlice) {
      return null;
    }

    if (!(endpointSlice instanceof EndpointSlice)) {
      this.props.logger.error(
        "[EndpointSliceDetails]: passed object that is not an instanceof EndpointSlice",
        endpointSlice,
      );

      return null;
    }

    return <div className="EndpointSliceDetails">N/A</div>;
  }
}

export const EndpointSliceDetails = withInjectables<Dependencies, EndpointSliceDetailsProps>(
  NonInjectedEndpointSliceDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
