/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import styles from "./ingress-class-details.module.scss";

import type { IngressClass } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface IngressClassDetailsProps extends KubeObjectDetailsProps<IngressClass> {}

@observer
class NonInjectedIngressDetails extends React.Component<IngressClassDetailsProps> {
  renderParameters() {
    const { object: ingressClass } = this.props;

    if (!ingressClass.spec.parameters) return;

    return (
      <>
        <DrawerTitle>Parameters</DrawerTitle>
        <DrawerItem name="Name">{ingressClass.getCtrlName()}</DrawerItem>
        <DrawerItem name="Namespace">{ingressClass.getCtrlNs()}</DrawerItem>
        <DrawerItem name="Scope">{ingressClass.getCtrlScope()}</DrawerItem>
        <DrawerItem name="Kind">{ingressClass.getCtrlKind()}</DrawerItem>
        <DrawerItem name="API Group">{ingressClass.getCtrlApiGroup()}</DrawerItem>
      </>
    );
  }

  render() {
    const { object: ingressClass } = this.props;

    return (
      <div className={styles.IngressClassDetails}>
        <DrawerItem name="Controller">
          <Badge label={ingressClass.getController()} />
        </DrawerItem>
        {this.renderParameters()}
      </div>
    );
  }
}

export const IngressClassDetails = withInjectables<{}, IngressClassDetailsProps>(NonInjectedIngressDetails, {
  getProps: (di, props) => props,
});
