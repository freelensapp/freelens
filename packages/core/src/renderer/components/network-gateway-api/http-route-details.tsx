/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./http-route-details.scss";

import { HTTPRoute } from "@freelensapp/kube-object";
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
import { renderHttpRouteMatches } from "./gateway-api-route-matches";
import { getGatewayApiVersion } from "./gateway-api-version";

import type { HTTPRouteRule } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface HTTPRouteDetailsProps extends KubeObjectDetailsProps<HTTPRoute> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedHTTPRouteDetails extends React.Component<HTTPRouteDetailsProps & Dependencies> {
  renderRules(rules: HTTPRouteRule[]) {
    if (rules.length === 0) {
      return <p>No rules defined</p>;
    }

    const { object: httpRoute } = this.props;

    if (!httpRoute) {
      return null;
    }

    return rules.map((rule, ruleIndex) => (
      <div key={ruleIndex} className="rule">
        <DrawerItem name={`Rule ${ruleIndex + 1}`}>
          {rule.matches && rule.matches.length > 0 && (
            <GatewayApiRuleSection className="matches" label="Matches:">
              {renderHttpRouteMatches(rule.matches)}
            </GatewayApiRuleSection>
          )}
          {rule.backendRefs && rule.backendRefs.length > 0 && (
            <GatewayApiRuleSection className="backends" label="Backends:">
              {renderBackendLinks(httpRoute, rule.backendRefs)}
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
    const { object: httpRoute, logger } = this.props;

    if (!httpRoute) {
      return null;
    }

    if (!(httpRoute instanceof HTTPRoute)) {
      logger.error("[HTTPRouteDetails]: passed object that is not an instanceof HTTPRoute", httpRoute);

      return null;
    }

    const hostnames = httpRoute.getHostnames();
    const parentRefs = httpRoute.getParentRefs();
    const rules = httpRoute.getRoutes();
    const backendRefs = httpRoute.getBackendRefs();

    return (
      <div className="HTTPRouteDetails">
        <DrawerItem name="Hostnames">{hostnames.length > 0 ? hostnames.join(", ") : "*"}</DrawerItem>
        <DrawerItem name="Accepted">
          <KubeObjectStatusIcon object={httpRoute} />
        </DrawerItem>

        <DrawerTitle>Parent References (Gateways)</DrawerTitle>
        <GatewayApiParentRefsTable
          object={httpRoute}
          parentRefs={parentRefs}
          apiVersion={getGatewayApiVersion(httpRoute)}
        />

        <DrawerTitle>Rules</DrawerTitle>
        {this.renderRules(rules)}

        <DrawerTitle>All Backend References</DrawerTitle>
        <GatewayApiBackendRefsTable object={httpRoute} backendRefs={backendRefs} />
      </div>
    );
  }
}

export const HTTPRouteDetails = withInjectables<Dependencies, HTTPRouteDetailsProps>(NonInjectedHTTPRouteDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
  }),
});
