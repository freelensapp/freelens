/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import type { Pod } from "@freelensapp/kube-object";
import { observer } from "mobx-react";
import React from "react";
import { DrawerTitle } from "../../../drawer";
import { VolumeVariant } from "./variant";

export interface PodVolumesProps {
  pod: Pod;
}

export const PodVolumes = observer(({ pod }: PodVolumesProps) => {
  const volumes = pod.getVolumes() ?? [];

  if (volumes.length === 0) {
    return null;
  }

  return (
    <>
      <DrawerTitle>Volumes</DrawerTitle>
      {volumes.map((volume) => (
        <div key={volume.name} className="volume">
          <div className="title flex gaps">
            <Icon small material="storage" />
            <span>{volume.name}</span>
          </div>
          <VolumeVariant pod={pod} volume={volume} />
        </div>
      ))}
    </>
  );
});
