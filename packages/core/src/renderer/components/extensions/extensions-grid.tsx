/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import styles from "./extensions-grid.module.scss";

export interface ExtensionsGridProps {
  children: React.ReactNode;
}

export const ExtensionsGrid: React.FC<ExtensionsGridProps> = ({ children }) => {
  return <div className={styles.grid}>{children}</div>;
};
