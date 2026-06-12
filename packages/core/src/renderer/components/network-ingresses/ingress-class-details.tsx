/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Link } from "react-router-dom";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import getDetailsUrlInjectable, { type GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import styles from "./ingress-class-details.module.scss";

import type { IngressClass } from "@freelensapp/kube-object";

import type { ApiManager } from "../../../common/k8s-api/api-manager";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface IngressClassDetailsProps extends KubeObjectDetailsProps<IngressClass> {}

interface Dependencies {
  apiManager: ApiManager;
  getDetailsUrl: GetDetailsUrl;
}

@observer
class NonInjectedIngressDetails extends React.Component<IngressClassDetailsProps & Dependencies> {
  constructor(props: IngressClassDetailsProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  renderParameters() {
    const { object: ingressClass } = this.props;

    if (!ingressClass.spec.parameters) return;

    const url =
      ingressClass.spec.parameters &&
      this.props.getDetailsUrl(this.props.apiManager.lookupApiLink(ingressClass.spec.parameters));

    return (
      <>
        <DrawerTitle>Parameters</DrawerTitle>
        <DrawerItem name="Name">
          {url ? (
            <Link key="link" to={url} onClick={stopPropagation}>
              {ingressClass.getCtrlName()}
            </Link>
          ) : (
            ingressClass.getCtrlName()
          )}
        </DrawerItem>
        <DrawerItem name="Namespace" hidden={!ingressClass.getCtrlNs()}>
          {ingressClass.getCtrlNs()}
        </DrawerItem>
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

export const IngressClassDetails = withInjectables<Dependencies, IngressClassDetailsProps>(NonInjectedIngressDetails, {
  getProps: (di, props) => ({
    ...props,
    apiManager: di.inject(apiManagerInjectable),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
  }),
});
