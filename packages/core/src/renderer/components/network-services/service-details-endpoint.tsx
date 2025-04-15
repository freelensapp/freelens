/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Endpoints } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";
import { Table, TableCell, TableHead, TableRow } from "../table";

export interface ServiceDetailsEndpointProps {
  endpoints: Endpoints;
}

interface Dependencies {
  logger: Logger;
  showDetails: ShowDetails;
}

@observer
class NonInjectedServiceDetailsEndpoint extends React.Component<ServiceDetailsEndpointProps & Dependencies> {
  render() {
    const { endpoints } = this.props;

    if (!endpoints) {
      return null;
    }

    if (!(endpoints instanceof Endpoints)) {
      this.props.logger.error("[ServiceDetailsEndpoint]: passed object that is not an instanceof Endpoints", endpoints);

      return null;
    }

    return (
      <div className="EndpointList flex column">
        <Table selectable virtual={false} scrollable={false} className="box grow">
          <TableHead flat>
            <TableCell className="name">Name</TableCell>
            <TableCell className="endpoints">Endpoints</TableCell>
          </TableHead>
          <TableRow
            key={endpoints.getId()}
            nowrap
            onClick={prevDefault(() => this.props.showDetails(endpoints.selfLink, false))}
          >
            <TableCell className="name">{endpoints.getName()}</TableCell>
            <TableCell className="endpoints">{endpoints.toString()}</TableCell>
          </TableRow>
        </Table>
      </div>
    );
  }
}

export const ServiceDetailsEndpoint = withInjectables<Dependencies, ServiceDetailsEndpointProps>(
  NonInjectedServiceDetailsEndpoint,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      showDetails: di.inject(showDetailsInjectable),
    }),
  },
);
