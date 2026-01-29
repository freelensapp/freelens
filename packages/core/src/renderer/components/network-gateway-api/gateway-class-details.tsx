/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./gateway-class-details.scss";

import { GatewayClass } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { LinkToNamespace, LinkToObject } from "../kube-object-link";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";

import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface GatewayClassDetailsProps extends KubeObjectDetailsProps<GatewayClass> {}

interface Dependencies {
  logger: Logger;
}

const NonInjectedGatewayClassDetails = observer((props: GatewayClassDetailsProps & Dependencies) => {
  const { object: gatewayClass, logger } = props;

  if (!gatewayClass) {
    return null;
  }

  if (!(gatewayClass instanceof GatewayClass)) {
    logger.error("[GatewayClassDetails]: passed object that is not an instanceof GatewayClass", gatewayClass);

    return null;
  }

  const parametersRef = gatewayClass.getParametersRef();
  const parametersApiVersion = parametersRef?.group ? `${parametersRef.group}/v1` : undefined;

  return (
    <div className="GatewayClassDetails">
      <DrawerItem name="Controller">{gatewayClass.getControllerName()}</DrawerItem>
      <DrawerItem name="Accepted">
        <KubeObjectStatusIcon object={gatewayClass} />
      </DrawerItem>
      {parametersRef && (
        <>
          <DrawerTitle>Parameters</DrawerTitle>
          <DrawerItem name="Kind">{parametersRef.kind}</DrawerItem>
          <DrawerItem name="Name">
            <LinkToObject
              object={gatewayClass}
              objectRef={{
                kind: parametersRef.kind,
                name: parametersRef.name,
                namespace: parametersRef.namespace,
                apiVersion: parametersApiVersion,
              }}
            />
          </DrawerItem>
          <DrawerItem name="Namespace">
            {parametersRef.namespace ? <LinkToNamespace namespace={parametersRef.namespace} /> : "-"}
          </DrawerItem>
          <DrawerItem name="Group">{parametersRef.group}</DrawerItem>
        </>
      )}
    </div>
  );
});

export const GatewayClassDetails = withInjectables<Dependencies, GatewayClassDetailsProps>(
  NonInjectedGatewayClassDetails,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);
