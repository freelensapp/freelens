/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  clusterIconSettingsComponentInjectionToken,
  clusterIconSettingsMenuInjectionToken,
} from "@freelensapp/cluster-settings";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Avatar } from "../avatar";
import { FilePicker, OverSizeLimitStyle } from "../file-picker";
import { MenuActions, MenuItem } from "../menu";

import type { ClusterIconMenuItem, ClusterIconSettingsComponent } from "@freelensapp/cluster-settings";
import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue } from "mobx";

import type { KubernetesCluster } from "../../../common/catalog-entities";
import type { Cluster } from "../../../common/cluster/cluster";

export interface ClusterIconSettingProps {
  cluster: Cluster;
  entity: KubernetesCluster;
}

interface Dependencies {
  menuItems: IComputedValue<ClusterIconMenuItem[]>;
  settingComponents: IComputedValue<ClusterIconSettingsComponent[]>;
  showErrorNotification: ShowNotification;
}

const colors = [
  "#e06c75", // Ruby Red
  "#ff7f50", // Sunset Orange
  "#e5c07b", // Amber Yellow
  "#98c379", // Emerald Green
  "#56b6c2", // Teal / Cyan
  "#61afef", // Royal Blue
  "#c678dd", // Purple
  "#abb2bf", // Slate Gray
];

const NonInjectedClusterIconSetting = observer((props: ClusterIconSettingProps & Dependencies) => {
  const element = React.createRef<HTMLDivElement>();
  const { cluster, entity } = props;
  const menuId = `menu-actions-for-cluster-icon-settings-for-${entity.getId()}`;

  const onIconPick = async ([file]: File[]) => {
    if (!file) {
      return;
    }

    try {
      const buf = Buffer.from(await file.arrayBuffer());

      cluster.preferences.icon = `data:${file.type};base64,${buf.toString("base64")}`;
    } catch (e) {
      props.showErrorNotification(String(e));
    }
  };

  const onUploadClick = () => {
    element.current?.querySelector<HTMLInputElement>("input[type=file]")?.click();
  };

  const selectColor = (color: string | null) => {
    cluster.preferences.icon = color;
  };

  const isCustomColorSelected =
    cluster.preferences.icon &&
    !cluster.preferences.icon.startsWith("data:") &&
    !colors.includes(cluster.preferences.icon);

  return (
    <div ref={element}>
      <div className="file-loader flex flex-row items-center">
        <div className="mr-5">
          <FilePicker
            accept="image/*"
            label={
              <Avatar
                colorHash={`${entity.getName()}-${entity.metadata.source}`}
                title={entity.getName()}
                src={entity.spec.icon?.src}
                size={53}
                background={entity.spec.icon?.background}
              />
            }
            onOverSizeLimit={OverSizeLimitStyle.FILTER}
            handler={onIconPick}
          />
        </div>
        <MenuActions
          id={menuId}
          data-testid={menuId}
          toolbar={false}
          autoCloseOnSelect={true}
          triggerIcon={{ material: "more_horiz" }}
        >
          <MenuItem onClick={onUploadClick}>Upload Icon</MenuItem>
          {props.menuItems.get().map((item) => (
            <MenuItem
              onClick={() => item.onClick(cluster.preferences)}
              key={item.id}
              disabled={item.disabled?.(cluster.preferences)}
            >
              {item.title}
            </MenuItem>
          ))}
        </MenuActions>
      </div>

      <div style={{ marginTop: "16px" }}>
        <div style={{ marginBottom: "8px", fontWeight: 500, fontSize: "calc(var(--font-size) * 0.9)", opacity: 0.8 }}>
          Background Color
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Auto/Clear Button */}
          <button
            type="button"
            onClick={() => selectColor(null)}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: "transparent",
              border: !cluster.preferences.icon ? "2px solid var(--primary)" : "2px solid var(--borderFaint)",
              boxShadow: !cluster.preferences.icon ? "0 0 4px var(--primary)" : "0 0 2px rgba(0,0,0,0.1)",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: !cluster.preferences.icon ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.1s ease, border-color 0.1s ease",
            }}
            title="Auto-generated color"
          >
            <span style={{ fontSize: "9px", fontWeight: "bold", opacity: 0.8 }}>Auto</span>
          </button>

          {/* Predefined Colors */}
          {colors.map((color) => {
            const isSelected = cluster.preferences.icon === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => selectColor(color)}
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: isSelected ? "2px solid var(--primary)" : "2px solid transparent",
                  boxShadow: isSelected ? "0 0 4px var(--primary)" : "0 0 2px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  padding: 0,
                  transform: isSelected ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.1s ease, border-color 0.1s ease",
                }}
                title={color}
              />
            );
          })}

          {/* Custom Color Rainbow Picker */}
          <div
            style={{
              position: "relative",
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              cursor: "pointer",
              border: isCustomColorSelected ? "2px solid var(--primary)" : "2px solid var(--borderFaint)",
              boxShadow: isCustomColorSelected ? "0 0 4px var(--primary)" : "0 0 2px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: cluster.preferences.icon && !cluster.preferences.icon.startsWith("data:")
                ? cluster.preferences.icon
                : "linear-gradient(45deg, red, orange, yellow, green, blue, purple)",
              transform: isCustomColorSelected ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.1s ease, border-color 0.1s ease",
            }}
            title="Custom Color"
          >
            <input
              type="color"
              value={cluster.preferences.icon && !cluster.preferences.icon.startsWith("data:") ? cluster.preferences.icon : "#61afef"}
              onChange={(e) => selectColor(e.target.value)}
              style={{
                position: "absolute",
                top: "-5px",
                left: "-5px",
                width: "36px",
                height: "36px",
                opacity: 0,
                cursor: "pointer",
              }}
            />
            {!isCustomColorSelected && (
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", textShadow: "0 0 2px rgba(0,0,0,0.5)" }}>+</span>
            )}
          </div>
        </div>
      </div>

      {props.settingComponents.get().map((item) => {
        return <item.Component key={item.id} preferences={cluster.preferences} />;
      })}
    </div>
  );
});

export const ClusterIconSetting = withInjectables<Dependencies, ClusterIconSettingProps>(
  NonInjectedClusterIconSetting,
  {
    getProps: (di, props) => {
      const computedInjectMany = di.inject(computedInjectManyInjectable);

      return {
        ...props,
        menuItems: computedInjectMany(clusterIconSettingsMenuInjectionToken),
        settingComponents: computedInjectMany(clusterIconSettingsComponentInjectionToken),
        showErrorNotification: di.inject(showErrorNotificationInjectable),
      };
    },
  },
);
