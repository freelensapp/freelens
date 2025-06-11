/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EndpointSlice } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { WithTooltip } from "../badge";
import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";
import { Table, TableCell, TableHead, TableRow } from "../table";

export interface ServiceDetailsEndpointSlicesProps {
  endpointSlices: EndpointSlice[];
}

interface Dependencies {
  logger: Logger;
  showDetails: ShowDetails;
}

@observer
class NonInjectedServiceDetailsEndpointSlices extends React.Component<
  ServiceDetailsEndpointSlicesProps & Dependencies
> {
  render() {
    const { endpointSlices: endpointSlices } = this.props;

    if (!endpointSlices) {
      return null;
    }

    return (
      <div className="EndpointSlicesList flex column">
        <Table selectable virtual={false} scrollable={false} className="box grow">
          <TableHead flat>
            <TableCell className="name">Name</TableCell>
            <TableCell className="addressType">Type</TableCell>
            <TableCell className="endpoints">Ports</TableCell>
            <TableCell className="endpoints">Endpoints</TableCell>
          </TableHead>
          {endpointSlices.map((endpointSlice) => (
            <TableRow
              key={endpointSlice.getId()}
              nowrap
              onClick={prevDefault(() => this.props.showDetails(endpointSlice.selfLink, false))}
            >
              <TableCell className="name">
                <WithTooltip>{endpointSlice.getName()}</WithTooltip>
              </TableCell>
              <TableCell className="addressType">{endpointSlice.addressType}</TableCell>
              <TableCell className="ports">
                <WithTooltip>{endpointSlice.getPortsString()}</WithTooltip>
              </TableCell>
              <TableCell className="endpoints">
                <WithTooltip>{endpointSlice.getEndpointsString()}</WithTooltip>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    );
  }
}

export const ServiceDetailsEndpointSlices = withInjectables<Dependencies, ServiceDetailsEndpointSlicesProps>(
  NonInjectedServiceDetailsEndpointSlices,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      showDetails: di.inject(showDetailsInjectable),
    }),
  },
);
