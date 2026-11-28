/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import React from "react";
import styles from "./extension-provenance.module.scss";

import type { ExtensionProvenance as Provenance } from "../use-extension-card.hook";

export interface ExtensionProvenanceProps {
  provenance: Provenance;
  /** Where a development install was loaded from. */
  absolutePath: string;
}

const iconOf: Record<Provenance, string> = {
  verified: "verified",
  unverified: "gpp_maybe",
  development: "folder",
};

/**
 * How the installed build got here, as an icon with its meaning in the
 * tooltip: a checksum that was verified, one that was not available, or a
 * directory loaded in development, which has no checksum to verify.
 */
export const ExtensionProvenance: React.FC<ExtensionProvenanceProps> = ({ provenance, absolutePath }) => (
  <Icon
    material={iconOf[provenance]}
    small
    className={styles[provenance]}
    tooltip={
      provenance === "verified"
        ? "Verified: its checksum was checked when it was installed"
        : provenance === "unverified"
          ? "Unverified: no checksum was available when it was installed"
          : `Development: loaded from ${absolutePath}`
    }
    data-testid="extension-provenance"
    data-provenance={provenance}
  />
);
