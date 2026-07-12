/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { prevDefault } from "@freelensapp/utilities";
import React from "react";
import { findOptimalDefaultContainer } from "../dock/logs/default-container-helper";
import { MenuItem, SubMenu } from "../menu";
import { StatusBrick } from "../status-brick";
import { containerStatusClassName } from "../workloads-pods/container-status-class-name";

import type {
  Container,
  ContainerWithType,
  EphemeralContainerWithType,
  PodContainerStatus,
} from "@freelensapp/kube-object";

export interface NodePodMenuItemProps {
  material?: string;
  svg?: string;
  title: string;
  tooltip: string;
  toolbar: boolean;
  annotations: string[];
  containers: (ContainerWithType | EphemeralContainerWithType)[];
  statuses: PodContainerStatus[];
  onMenuItemClick: (container: Container) => any;
}

const PodMenuItem: React.FC<NodePodMenuItemProps> = (props) => {
  const { material, svg, title, tooltip, toolbar, annotations, containers, statuses, onMenuItemClick } = props;

  if (!containers || !containers.length) return null;

  return (
    <>
      <MenuItem onClick={prevDefault(() => onMenuItemClick(findOptimalDefaultContainer(containers, annotations)))}>
        <Icon material={material} svg={svg} interactive={toolbar} tooltip={toolbar && tooltip} />
        <span className="title">{title}</span>
        <Icon className="arrow" material="keyboard_arrow_right" />
        <SubMenu>
          {containers.map((container) => {
            const { name } = container;
            const status = statuses.find((status) => status.name === name);
            const brick = status ? <StatusBrick className={containerStatusClassName(container, status)} /> : null;

            return (
              <MenuItem
                key={name}
                onClick={prevDefault(() => onMenuItemClick(container))}
                className="flex items-center"
              >
                {brick}
                <span>{name}</span>
              </MenuItem>
            );
          })}
        </SubMenu>
      </MenuItem>
    </>
  );
};

export default PodMenuItem;
