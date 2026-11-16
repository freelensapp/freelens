/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { computeDefaultShortName, limitGraphemeLengthOf } from "../../../common/catalog/helpers";
import { iconColors } from "../avatar/icon-colors";
import { Input } from "../input";
import { SubTitle } from "../layout/sub-title";
import styles from "./icon-appearance-setting.module.scss";
import { readIconFile } from "./read-icon-file";

import type { ShowNotification } from "@freelensapp/notifications";

import type { ChangeEvent } from "react";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";

export const maxIconShortNameLength = 3;

export interface ClusterIconAppearanceSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

export const ClusterIconLabelSetting = observer(({ cluster, entity }: ClusterIconAppearanceSettingProps) => {
  const savedShortName = cluster.preferences.iconShortName ?? "";
  const [shortName, setShortName] = useState(savedShortName);

  // The field keeps what is typed until blur, but follows a label saved elsewhere.
  useEffect(() => setShortName(savedShortName), [savedShortName]);

  const saveShortName = () => {
    const value = shortName.trim();

    if (value) {
      cluster.preferences.iconShortName = value;
    } else if (cluster.preferences.iconShortName) {
      cluster.preferences.iconShortName = null;
    }
  };

  return (
    <>
      <SubTitle title="Label" />
      <Input
        theme="round-black"
        value={shortName}
        size={maxIconShortNameLength}
        placeholder={computeDefaultShortName(entity.getName()).toUpperCase()}
        onChange={(value) => setShortName(limitGraphemeLengthOf(value, maxIconShortNameLength))}
        onBlur={saveShortName}
        onSubmit={saveShortName}
        data-testid="cluster-icon-short-name-input"
      />
    </>
  );
});

interface Dependencies {
  showErrorNotification: ShowNotification;
}

const NonInjectedClusterIconColorSetting = observer(
  ({ cluster, showErrorNotification }: ClusterIconAppearanceSettingProps & Dependencies) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const currentIcon = cluster.preferences.icon;
    const hasImage = Boolean(currentIcon?.startsWith("data:"));

    const pickColor = (color: string | null) => {
      cluster.preferences.icon = color;
    };

    const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
      const [file] = event.target.files ?? [];

      // The same file picked again has to fire the change event again.
      event.target.value = "";

      if (!file) {
        return;
      }

      try {
        cluster.preferences.icon = await readIconFile(file);
      } catch (error) {
        showErrorNotification(String(error));
      }
    };

    return (
      <>
        <SubTitle title="Icon Color" />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Icon color">
          <button
            type="button"
            className={cssNames(styles.swatch, styles.textSwatch, { [styles.selected]: !currentIcon })}
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
          <button
            type="button"
            title="Upload an image as the icon"
            className={cssNames(styles.swatch, styles.textSwatch, { [styles.selected]: hasImage })}
            aria-pressed={hasImage}
            onClick={() => fileInput.current?.click()}
            data-testid="cluster-icon-image"
          >
            Icon
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={pickImage}
            data-testid="cluster-icon-image-input"
          />
        </div>
      </>
    );
  },
);

export const ClusterIconColorSetting = withInjectables<Dependencies, ClusterIconAppearanceSettingProps>(
  NonInjectedClusterIconColorSetting,
  {
    getProps: (di, props) => ({
      ...props,
      showErrorNotification: di.inject(showErrorNotificationInjectable),
    }),
  },
);
