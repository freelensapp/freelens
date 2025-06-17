/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";

import type { StrictReactNode } from "@freelensapp/utilities";

interface FormControlLabelProps {
  control: React.ReactElement<any, any>;
  label: StrictReactNode;
}

/**
 * @deprecated Use <Switch/> instead from "../switch.tsx".
 */
export function FormSwitch(props: FormControlLabelProps & { children?: StrictReactNode }) {
  const ClonedElement = React.cloneElement(props.control, {
    children: <span>{props.label}</span>,
  });

  return ClonedElement;
}
