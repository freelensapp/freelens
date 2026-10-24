/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DrawerItem } from "../../../../drawer";

import type { VolumeVariantComponent } from "../variant-helpers";

export const ImageVolume: VolumeVariantComponent<"image"> = ({ variant: { reference, pullPolicy } }) => (
  <>
    <DrawerItem name="OCI Reference">{reference}</DrawerItem>
    <DrawerItem name="Pull Policy" hidden={!pullPolicy}>
      {pullPolicy}
    </DrawerItem>
  </>
);
