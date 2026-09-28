/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { computeDefaultShortName } from "../../../common/catalog/helpers";
import styles from "./avatar.module.scss";
import { seededColor } from "./seeded-color";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ImgHTMLAttributes, MouseEventHandler } from "react";

export interface AvatarProps {
  title: string;
  colorHash?: string;
  size?: number;
  src?: string;
  background?: string;
  variant?: "circle" | "rounded" | "square";
  imgProps?: ImgHTMLAttributes<HTMLImageElement>;
  disabled?: boolean;
  children?: StrictReactNode;
  className?: string;
  id?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  "data-testid"?: string;
}

export const Avatar = ({
  title,
  variant = "rounded",
  size = 32,
  colorHash,
  children,
  background,
  imgProps,
  src,
  className,
  disabled,
  id,
  onClick,
  "data-testid": dataTestId,
}: AvatarProps) => (
  <div
    className={cssNames(
      styles.Avatar,
      {
        [styles.circle]: variant == "circle",
        [styles.rounded]: variant == "rounded",
        [styles.disabled]: disabled,
      },
      className,
    )}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      // Falling back to the title keeps the colour stable for an avatar given
      // no explicit hash, which is also where the initials come from
      background: background || (src ? "transparent" : seededColor(colorHash ?? title)),
    }}
    id={id}
    onClick={onClick}
    data-testid={dataTestId}
  >
    {src ? <img src={src} {...imgProps} alt={title} /> : children || computeDefaultShortName(title)}
  </div>
);
