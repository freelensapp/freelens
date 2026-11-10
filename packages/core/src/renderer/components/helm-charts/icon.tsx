/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { useState } from "react";
import styles from "./icon.module.css";

export interface HelmChartIconProps {
  className?: string;
  imageUrl?: string;
}

export const HelmChartIcon = ({ imageUrl = "", className }: HelmChartIconProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const backgroundImage = `url(${imageUrl})`;

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const isValidImage = () => {
    return /^https?:\/\/.*(?<!\.svg)$/.test(imageUrl);
  };

  return (
    <div
      className={cssNames(styles.chartIcon, className, { [styles.imageNotLoaded]: !isImageLoaded })}
      data-testid="image-container"
      style={isImageLoaded ? { backgroundImage } : undefined}
    >
      {isValidImage() && <img className={styles.img} src={imageUrl} alt="" onLoad={handleImageLoad} />}
    </div>
  );
};
