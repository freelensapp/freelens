/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DrawerItem } from "../../../../drawer";
import { ImageReference } from "../../../../image-reference";

import type { Pod } from "@freelensapp/kube-object";

import type { VolumeVariantComponent } from "../variant-helpers";

const getImageRef = (pod: Pod, volumeName: string) =>
  pod
    .getContainerStatuses()
    .flatMap(({ volumeMounts = [] }) => volumeMounts)
    .find(({ name, volumeStatus }) => name === volumeName && volumeStatus?.image?.imageRef)?.volumeStatus?.image
    ?.imageRef;

export const ImageVolume: VolumeVariantComponent<"image"> = ({
  variant: { reference, pullPolicy },
  pod,
  volumeName,
}) => (
  <>
    <DrawerItem name="OCI Reference">
      {reference && <ImageReference reference={reference} digest={getImageRef(pod, volumeName)} />}
    </DrawerItem>
    <DrawerItem name="Pull Policy" hidden={!pullPolicy}>
      {pullPolicy}
    </DrawerItem>
  </>
);
