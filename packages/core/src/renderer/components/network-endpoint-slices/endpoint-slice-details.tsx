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
import { Link } from "react-router-dom";
import { ApiManager } from "../../../common/k8s-api/api-manager";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import { Badge, WithTooltip } from "../badge";
import { DrawerTitle } from "../drawer";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { Table, TableCell, TableHead, TableRow } from "../table";

export interface EndpointSliceDetailsProps extends KubeObjectDetailsProps<EndpointSlice> {}

interface Dependencies {
  logger: Logger;
  apiManager: ApiManager;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedEndpointSliceDetails extends React.Component<EndpointSliceDetailsProps & Dependencies> {
  render() {
    const { object: endpointSlice, getDetailsUrl, apiManager } = this.props;

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

    return (
      endpointSlice.endpoints &&
      endpointSlice.ports && (
        <div className="EndpointSliceDetails">
          <DrawerTitle>Endpoints</DrawerTitle>
          {endpointSlice.endpoints && endpointSlice.endpoints.length > 0 && (
            <>
              <div className="title flex gaps">Addresses</div>
              <Table items={endpointSlice.endpoints} selectable={false} scrollable={false} className="box grow">
                <TableHead>
                  <TableCell className="ip">IP</TableCell>
                  <TableCell className="host">Hostname</TableCell>
                  <TableCell className="node">Node</TableCell>
                  <TableCell className="zone">Zone</TableCell>
                  <TableCell className="target">Target</TableCell>
                  <TableCell className="conditions">Conditions</TableCell>
                </TableHead>
                {endpointSlice.endpoints.map((endpoint) =>
                  endpoint.addresses.map((address) => (
                    <TableRow key={address} nowrap>
                      <TableCell className="ip">
                        <WithTooltip>{address}</WithTooltip>
                      </TableCell>
                      <TableCell className="name">
                        <WithTooltip>{endpoint.hostname}</WithTooltip>
                      </TableCell>
                      <TableCell className="node">
                        {endpoint.nodeName && (
                          <Link to={getDetailsUrl(apiManager.lookupApiLink({ kind: "Node", name: endpoint.nodeName }))}>
                            <WithTooltip>{endpoint.nodeName}</WithTooltip>
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="zone">
                        <WithTooltip>{endpoint.zone}</WithTooltip>
                      </TableCell>
                      <TableCell className="target">
                        {endpoint.targetRef && (
                          <Link to={getDetailsUrl(apiManager.lookupApiLink(endpoint.targetRef, endpointSlice))}>
                            <WithTooltip>{endpoint.targetRef.name}</WithTooltip>
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="conditions">
                        {endpoint.conditions?.ready && (
                          <Badge key="ready" label="Ready" tooltip="Ready" className="ready" />
                        )}
                        {endpoint.conditions?.serving && (
                          <Badge key="serving" label="Serving" tooltip="Serving" className="serving" />
                        )}
                        {endpoint.conditions?.terminating && (
                          <Badge key="terminating" label="Terminating" tooltip="Terminating" className="terminating" />
                        )}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </Table>
            </>
          )}

          {endpointSlice.ports && endpointSlice.ports.length > 0 && (
            <>
              <div className="title flex gaps">Ports</div>
              <Table selectable={false} virtual={false} scrollable={false} className="box grow">
                <TableHead>
                  <TableCell className="port">Port</TableCell>
                  <TableCell className="name">Name</TableCell>
                  <TableCell className="protocol">Protocol</TableCell>
                </TableHead>
                {endpointSlice.ports?.map((port) => (
                  <TableRow key={port.port} nowrap>
                    <TableCell className="name">{port.port}</TableCell>
                    <TableCell className="name">{port.name}</TableCell>
                    <TableCell className="node">{port.protocol}</TableCell>
                  </TableRow>
                ))}
              </Table>
            </>
          )}
        </div>
      )
    );
  }
}

export const EndpointSliceDetails = withInjectables<Dependencies, EndpointSliceDetailsProps>(
  NonInjectedEndpointSliceDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      apiManager: di.inject(apiManagerInjectable),
      getDetailsUrl: di.inject(getDetailsUrlInjectable),
    }),
  },
);
