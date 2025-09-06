/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { KubeObject } from "@freelensapp/kube-object";
import React from "react";
import { MenuItem } from "../menu";

export interface SmartDeleteMenuItemProps {
  object: KubeObject;
  toolbar: boolean;
  onDelete: (object: KubeObject, deleteType: "normal" | "force" | "finalizers") => Promise<void>;
}

const SmartDeleteMenuItem: React.FC<SmartDeleteMenuItemProps> = (props) => {
  const { object, toolbar, onDelete } = props;

  const getDeleteMode = (obj: KubeObject): "normal" | "force" | "finalizers" => {
    // Check if object is in terminating state
    if (obj.metadata.deletionTimestamp) {
      return "finalizers";
    }

    // Check if object has finalizers
    if (obj.getFinalizers().length > 0) {
      return "force";
    }

    return "normal";
  };

  const getDeleteConfig = (mode: "normal" | "force" | "finalizers") => {
    switch (mode) {
      case "normal":
        return {
          title: "Delete",
          icon: "delete",
          onClick: () => onDelete(object, "normal"),
        };
      case "force":
        return {
          title: "Force Delete",
          icon: "delete_forever",
          onClick: () => onDelete(object, "force"),
        };
      case "finalizers":
        return {
          title: "Delete with Finalizers",
          icon: "delete_sweep",
          onClick: () => onDelete(object, "finalizers"),
        };
    }
  };

  const deleteMode = getDeleteMode(object);
  const config = getDeleteConfig(deleteMode);

  return (
    <MenuItem onClick={config.onClick}>
      <Icon material={config.icon} interactive={toolbar} tooltip={toolbar && config.title} />
      <span className="title">{config.title}</span>
    </MenuItem>
  );
};

export default SmartDeleteMenuItem;
