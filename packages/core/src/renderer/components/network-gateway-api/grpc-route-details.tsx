/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./grpc-route-details.scss";

import { GRPCRoute } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import {
  GatewayApiBackendRefsTable,
  GatewayApiParentRefsTable,
  GatewayApiRuleSection,
  renderBackendLinks,
} from "./gateway-api-route-details";
import { renderGrpcRouteMatches } from "./gateway-api-route-matches";
import { getGatewayApiVersion } from "./gateway-api-version";

import type { GRPCRouteRule } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface GRPCRouteDetailsProps extends KubeObjectDetailsProps<GRPCRoute> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedGRPCRouteDetails extends React.Component<GRPCRouteDetailsProps & Dependencies> {
  renderRules(rules: GRPCRouteRule[]) {
    if (rules.length === 0) {
      return <p>No rules defined</p>;
    }

    const { object: grpcRoute } = this.props;

    if (!grpcRoute) {
      return null;
    }

    return rules.map((rule, ruleIndex) => (
      <div key={ruleIndex} className="rule">
        <DrawerItem name={`Rule ${ruleIndex + 1}`}>
          {rule.matches && rule.matches.length > 0 && (
            <GatewayApiRuleSection className="matches" label="Matches:">
              {renderGrpcRouteMatches(rule.matches)}
            </GatewayApiRuleSection>
          )}
          {rule.backendRefs && rule.backendRefs.length > 0 && (
            <GatewayApiRuleSection className="backends" label="Backends:">
              {renderBackendLinks(grpcRoute, rule.backendRefs)}
            </GatewayApiRuleSection>
          )}
          {rule.filters && rule.filters.length > 0 && (
            <GatewayApiRuleSection className="filters" label="Filters:">
              {rule.filters.map((f) => f.type).join(", ")}
            </GatewayApiRuleSection>
          )}
        </DrawerItem>
      </div>
    ));
  }

  render() {
    const { object: grpcRoute, logger } = this.props;

    if (!grpcRoute) {
      return null;
    }

    if (!(grpcRoute instanceof GRPCRoute)) {
      logger.error("[GRPCRouteDetails]: passed object that is not an instanceof GRPCRoute", grpcRoute);

      return null;
    }

    const hostnames = grpcRoute.getHostnames();
    const parentRefs = grpcRoute.getParentRefs();
    const rules = grpcRoute.getRoutes();
    const backendRefs = grpcRoute.getBackendRefs();

    return (
      <div className="GRPCRouteDetails">
        <DrawerItem name="Hostnames">{hostnames.length > 0 ? hostnames.join(", ") : "*"}</DrawerItem>
        <DrawerItem name="Accepted">
          <KubeObjectStatusIcon object={grpcRoute} />
        </DrawerItem>

        <DrawerTitle>Parent References (Gateways)</DrawerTitle>
        <GatewayApiParentRefsTable
          object={grpcRoute}
          parentRefs={parentRefs}
          apiVersion={getGatewayApiVersion(grpcRoute)}
        />

        <DrawerTitle>Rules</DrawerTitle>
        {this.renderRules(rules)}

        <DrawerTitle>All Backend References</DrawerTitle>
        <GatewayApiBackendRefsTable object={grpcRoute} backendRefs={backendRefs} />
      </div>
    );
  }
}

export const GRPCRouteDetails = withInjectables<Dependencies, GRPCRouteDetailsProps>(NonInjectedGRPCRouteDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
  }),
});
