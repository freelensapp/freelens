/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./kube-object-status-icon.scss";

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import React from "react";

import type { KubeObject } from "@freelensapp/kube-object";
import type { IClassName } from "@freelensapp/utilities";

interface StatusResult {
  state: "positive" | "negative" | "unknown";
  label: string;
}

const getStatusResult = (object?: KubeObject): StatusResult => {
  if (!object) {
    return { state: "unknown", label: "Unknown" };
  }

  const maybeReady = (object as { isReady?: () => boolean }).isReady;

  if (typeof maybeReady === "function") {
    return maybeReady() ? { state: "positive", label: "Ready" } : { state: "negative", label: "Not Ready" };
  }

  const maybeAccepted = (object as { isAccepted?: () => boolean }).isAccepted;

  if (typeof maybeAccepted === "function") {
    return maybeAccepted() ? { state: "positive", label: "Accepted" } : { state: "negative", label: "Not Accepted" };
  }

  return { state: "unknown", label: "Unknown" };
};

export interface KubeObjectStatusIconProps {
  object?: KubeObject;
  className?: IClassName;
}

export const KubeObjectStatusIcon = ({ object, className }: KubeObjectStatusIconProps) => {
  const { state, label } = getStatusResult(object);

  const icon = state === "positive" ? "check_circle" : state === "negative" ? "error" : "help";

  return (
    <Icon
      small
      material={icon}
      tooltip={label}
      aria-label={label}
      className={cssNames("KubeObjectStatusIcon", state, className)}
    />
  );
};
