/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SecretApi } from "@freelensapp/kube-api";
import { secretApiInjectable } from "@freelensapp/kube-api-specifics";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { DrawerItem } from "../../../../drawer";
import type { PodVolumeVariantSpecificProps } from "../variant-helpers";
import { LocalRef } from "../variant-helpers";

interface Dependencies {
  secretApi: SecretApi;
}

const NonInjectedFlexVolume = (props: PodVolumeVariantSpecificProps<"flexVolume"> & Dependencies) => {
  const {
    pod,
    variant: { driver, fsType, secretRef, readOnly = false, options = {} },
    secretApi,
  } = props;

  return (
    <>
      <DrawerItem name="Driver">{driver}</DrawerItem>
      <DrawerItem name="Filesystem Type">{fsType || "-- system default --"}</DrawerItem>
      <LocalRef pod={pod} title="Secret" kubeRef={secretRef} api={secretApi} />
      <DrawerItem name="Readonly">{readOnly.toString()}</DrawerItem>
      {Object.entries(options).map(([key, value]) => (
        <DrawerItem key={key} name={`Option: ${key}`}>
          {value}
        </DrawerItem>
      ))}
    </>
  );
};

export const FlexVolume = withInjectables<Dependencies, PodVolumeVariantSpecificProps<"flexVolume">>(
  NonInjectedFlexVolume,
  {
    getProps: (di, props) => ({
      ...props,
      secretApi: di.inject(secretApiInjectable),
    }),
  },
);
