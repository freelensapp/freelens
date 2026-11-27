/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { safeJSONPathValue } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";

import type { AdditionalPrinterColumnsV1, KubeObject } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { ComponentType } from "react";

import type { CustomResourceColumnProps } from "./custom-resource-columns-registration";

export interface CustomResourceColumnOfExtensionProps {
  object: KubeObject;
  column: AdditionalPrinterColumnsV1;
  extensionName: string;
  Render: ComponentType<CustomResourceColumnProps>;
  /** What the host shows when `Render` throws: its own rendering of the value. */
  fallback: StrictReactNode;
}

interface Dependencies {
  logger: Logger;
}

interface State {
  failed: boolean;
}

/**
 * A printer column rendered by the component of the extension that registered
 * it, inside a boundary of its own: a component that throws costs only its
 * column, which shows the host's rendering of the value instead.
 */
class NonInjectedCustomResourceColumnOfExtension extends React.Component<
  CustomResourceColumnOfExtensionProps & Dependencies,
  State
> {
  public state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    const { logger, extensionName, object, column } = this.props;

    logger.error(
      `[EXTENSIONS]: ${extensionName}: the column "${column.name}" of ${object.kind} failed to render, its value is shown instead`,
      error,
    );
  }

  render() {
    const { object, column, Render, fallback } = this.props;

    if (this.state.failed) {
      return fallback;
    }

    return <Render object={object} value={safeJSONPathValue(object, column.jsonPath)} column={column} />;
  }
}

const InjectedCustomResourceColumnOfExtension = withInjectables<Dependencies, CustomResourceColumnOfExtensionProps>(
  NonInjectedCustomResourceColumnOfExtension,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
    }),
  },
);

/**
 * Keyed by the object and its version, so that a component that threw tries
 * again when the object changes.
 */
export const CustomResourceColumnOfExtension = (props: CustomResourceColumnOfExtensionProps) => (
  <InjectedCustomResourceColumnOfExtension
    key={`${props.object.getId()}/${props.object.getResourceVersion()}`}
    {...props}
  />
);
