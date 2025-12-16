/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

export interface ExtensionsGridProps {
  children: React.ReactNode;
}

export const ExtensionsGrid: React.FC<ExtensionsGridProps> = ({ children }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.5rem",
        marginTop: "1rem",
      }}
    >
      {children}
    </div>
  );
};
