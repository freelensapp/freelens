/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import type { DOMAttributes } from "react";
import React from "react";
import styles from "./notice.module.scss";

export interface NoticeProps extends DOMAttributes<any> {
  className?: string;
}

export function Notice(props: NoticeProps) {
  return <div className={cssNames(styles.notice, props.className)}>{props.children}</div>;
}
