/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import React from "react";
import styles from "./horizontal-line.module.scss";

interface HorizontalLineProps {
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
}

export const HorizontalLine = ({ size = "xl" }: HorizontalLineProps = { size: "xl" }) => {
  const classNames = cssNames(styles.HorizontalLine, styles[`size-${size}`]);

  return <div className={classNames} />;
};
