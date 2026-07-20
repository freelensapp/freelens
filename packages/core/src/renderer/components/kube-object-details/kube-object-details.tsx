/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-details.scss";

import { Spinner } from "@freelensapp/spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Drawer } from "../drawer";
import hideDetailsInjectable from "../kube-detail-params/hide-details.injectable";
import kubeDetailsUrlParamInjectable from "../kube-detail-params/kube-details-url.injectable";
import { KubeObjectMenu } from "../kube-object-menu";
import currentKubeObjectInDetailsInjectable from "./current-kube-object-in-details.injectable";
import kubeObjectDetailItemsInjectable from "./kube-object-detail-items/kube-object-detail-items.injectable";

import type { KubeObject } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import type { IComputedValue } from "mobx";

import type { PageParam } from "../../navigation/page-param";
import type { HideDetails } from "../kube-detail-params/hide-details.injectable";
import type { CurrentKubeObject } from "./current-kube-object-in-details.injectable";

export interface KubeObjectDetailsProps<Kube extends KubeObject = KubeObject> {
  className?: string;
  object: Kube;
}

interface Dependencies {
  detailComponents: IComputedValue<React.ElementType[]>;
  kubeObject: IAsyncComputed<CurrentKubeObject>;
  hideDetails: HideDetails;
  kubeDetailsUrlParam: PageParam<string>;
}

const NonInjectedKubeObjectDetails = observer((props: Dependencies) => {
  const { detailComponents, hideDetails, kubeObject, kubeDetailsUrlParam } = props;

  const currentKubeObject = kubeObject.value.get();
  const isLoading = kubeObject.pending.get();

  // Only open the drawer when an object is actually selected in the URL. The
  // async-computed reports `pending === true` on its very first evaluation even
  // when no object is selected; React 18's createRoot commits that transient
  // state, which flashed an empty details drawer open on startup (React 17's
  // legacy renderer never painted it). Gating on the URL param avoids the flash.
  const hasSelectedObject = Boolean(kubeDetailsUrlParam.get());

  return (
    <Drawer
      className="KubeObjectDetails flex flex-col"
      open={hasSelectedObject && Boolean(isLoading || currentKubeObject)}
      title={currentKubeObject?.object ? `${currentKubeObject.object.kind}: ${currentKubeObject.object.getName()}` : ""}
      toolbar={currentKubeObject?.object && <KubeObjectMenu object={currentKubeObject.object} toolbar={true} />}
      onClose={hideDetails}
    >
      {isLoading && <Spinner center />}
      {currentKubeObject?.error && (
        <div className="m-auto">
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
    kubeDetailsUrlParam: di.inject(kubeDetailsUrlParamInjectable),
  }),
});
