/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { Fragment } from "react";
import { WithTooltip } from "../with-tooltip";
import styles from "./pod-images-cell.module.scss";

import type { Pod } from "@freelensapp/kube-object";

export interface PodImagesCellProps {
  pod: Pod;
}

export function getPodContainerImages(pod: Pod): string[] {
  return pod.getContainers().flatMap((container) => (container.image ? [container.image] : []));
}

export const PodImagesCell = ({ pod }: PodImagesCellProps) => {
  const containers = pod.getContainers().filter((container) => container.image);

  if (containers.length === 0) {
    return <span className={cssNames(styles.cell, styles.none)}>-</span>;
  }

  const label = (
    <span className={styles.images}>
      {containers.map(({ name, image }, index) => (
        <Fragment key={name}>
          {index > 0 && <span className={styles.separator}>,</span>}
          <span className={styles.image}>
            <bdi dir="ltr">{image}</bdi>
          </span>
        </Fragment>
      ))}
    </span>
  );
  const tooltip = (
    <>
      {containers.map(({ name, image }) => (
        <div key={name}>{`${name}: ${image}`}</div>
      ))}
    </>
  );

  return (
    <div className={styles.cell}>
      <WithTooltip tooltip={tooltip}>{label}</WithTooltip>
    </div>
  );
};
