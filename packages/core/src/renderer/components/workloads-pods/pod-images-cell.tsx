/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-images-cell.scss";

import { Fragment } from "react";
import { WithTooltip } from "../with-tooltip";

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
    return <span className="PodImagesCell none">-</span>;
  }

  // An image that does not fit loses its start rather than its end, so its tag or digest stays visible.
  const label = (
    <span className="images">
      {containers.map(({ name, image }, index) => (
        <Fragment key={name}>
          {index > 0 && <span className="separator">,</span>}
          <span className="image">
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
    <div className="PodImagesCell">
      <WithTooltip tooltip={tooltip}>{label}</WithTooltip>
    </div>
  );
};
