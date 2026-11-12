/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { cssNames } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { useState } from "react";
import { computeDefaultShortName, limitGraphemeLengthOf } from "../../../common/catalog/helpers";
import { iconColors } from "../avatar/icon-colors";
import { Input } from "../input";
import { SubTitle } from "../layout/sub-title";
import styles from "./icon-appearance-setting.module.scss";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";

export const maxIconShortNameLength = 4;

export interface ClusterIconAppearanceSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

export const ClusterIconAppearanceSetting = observer(({ cluster, entity }: ClusterIconAppearanceSettingProps) => {
  const [shortName, setShortName] = useState(cluster.preferences.iconShortName ?? "");
  const currentIcon = cluster.preferences.icon;
  const hasImage = Boolean(currentIcon?.startsWith("data:"));

  const saveShortName = () => {
    const value = shortName.trim();

    if (value) {
      cluster.preferences.iconShortName = value;
    } else if (cluster.preferences.iconShortName) {
      cluster.preferences.iconShortName = null;
    }
  };

  const pickColor = (color: string | null) => {
    cluster.preferences.icon = color;
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <SubTitle title="Icon Label" />
        <Input
          theme="round-black"
          value={shortName}
          placeholder={computeDefaultShortName(entity.getName()).toUpperCase()}
          onChange={(value) => setShortName(limitGraphemeLengthOf(value, maxIconShortNameLength))}
          onBlur={saveShortName}
          onSubmit={saveShortName}
          data-testid="cluster-icon-short-name-input"
        />
      </div>
      <div>
        <SubTitle title="Icon Color" />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Icon color">
          <button
            type="button"
            className={cssNames(styles.swatch, styles.defaultSwatch, { [styles.selected]: !currentIcon })}
            aria-pressed={!currentIcon}
            onClick={() => currentIcon && pickColor(null)}
            data-testid="cluster-icon-color-default"
          >
            Auto
          </button>
          {iconColors.map((color) => {
            const selected = !hasImage && currentIcon === color.value;

            return (
              <button
                key={color.value}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={selected}
                className={cssNames(styles.swatch, { [styles.selected]: selected })}
                style={{ background: color.value }}
                onClick={() => pickColor(color.value)}
                data-testid={`cluster-icon-color-${color.name.toLowerCase()}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
