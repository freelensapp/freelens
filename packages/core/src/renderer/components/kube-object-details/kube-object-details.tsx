/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-details.scss";

import type { KubeObject } from "@freelensapp/kube-object";
import { Spinner } from "@freelensapp/spinner";
import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Drawer } from "../drawer";
import type { HideDetails } from "../kube-detail-params/hide-details.injectable";
import hideDetailsInjectable from "../kube-detail-params/hide-details.injectable";
import { KubeObjectMenu } from "../kube-object-menu";
import type { CurrentKubeObject } from "./current-kube-object-in-details.injectable";
import currentKubeObjectInDetailsInjectable from "./current-kube-object-in-details.injectable";
import kubeObjectDetailItemsInjectable from "./kube-object-detail-items/kube-object-detail-items.injectable";

export interface KubeObjectDetailsProps<Kube extends KubeObject = KubeObject> {
  className?: string;
  object: Kube;
}

interface Dependencies {
  detailComponents: IComputedValue<React.ElementType[]>;
  kubeObject: IAsyncComputed<CurrentKubeObject>;
  hideDetails: HideDetails;
}

const NonInjectedKubeObjectDetails = observer((props: Dependencies) => {
  const { detailComponents, hideDetails, kubeObject } = props;

  const currentKubeObject = kubeObject.value.get();
  const isLoading = kubeObject.pending.get();

  return (
    <Drawer
      className="KubeObjectDetails flex column"
      open={Boolean(isLoading || currentKubeObject)}
      title={currentKubeObject?.object ? `${currentKubeObject.object.kind}: ${currentKubeObject.object.getName()}` : ""}
      toolbar={currentKubeObject?.object && <KubeObjectMenu object={currentKubeObject.object} toolbar={true} />}
      onClose={hideDetails}
    >
      {isLoading && <Spinner center />}
      {currentKubeObject?.error && (
        <div className="box center">
          Resource loading has failed:
          <b>{currentKubeObject.error}</b>
        </div>
      )}
      {currentKubeObject?.object && (
        <>
          {detailComponents.get().map((Component, index) => (
            <Component key={index} object={currentKubeObject.object} />
          ))}
        </>
      )}
    </Drawer>
  );
});

export const KubeObjectDetails = withInjectables<Dependencies>(NonInjectedKubeObjectDetails, {
  getProps: (di, props) => ({
    ...props,
    hideDetails: di.inject(hideDetailsInjectable),
    detailComponents: di.inject(kubeObjectDetailItemsInjectable),
    kubeObject: di.inject(currentKubeObjectInDetailsInjectable),
  }),
});
