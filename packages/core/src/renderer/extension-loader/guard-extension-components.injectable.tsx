/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ReportingErrorBoundary, SilentErrorBoundary } from "@freelensapp/error-boundary";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ErrorInfo } from "react";

import type { LensExtension } from "../../extensions/lens-extension";

export interface GuardComponentOptions<Props> {
  /**
   * What replaces the component after it throws: the error view of the host for a page or a panel, nothing for a
   * slot too small for the view.
   */
  fallback: "view" | "nothing";
  /**
   * Renders the component again after it threw when the returned value changes, compared by identity, e.g. the
   * object a details panel shows.
   */
  resetKey?: (props: Props) => unknown;
}

export interface ExtensionComponentGuard {
  /**
   * Wraps a component of the field in an error boundary that logs what it catches with the name of the extension.
   * Call it once per registration, not in a render: every call returns a new component type, which React mounts anew.
   */
  component<Props extends object>(
    Component: React.ComponentType<Props>,
    options: GuardComponentOptions<Props>,
  ): React.ComponentType<Props>;

  /**
   * Wraps a render callback of the field, which the host calls from its own render: what the call throws renders
   * nothing, and the element it returns gets a boundary that renders nothing in its place.
   */
  render<Item extends object>(render: (item: Item) => StrictReactNode): (item: Item) => StrictReactNode;
}

/**
 * Guards the components a registrator takes from a field of an extension, so that an error one of them throws while
 * React renders it replaces only that component, not the UI of the host around it.
 */
export type GuardExtensionComponents = (extension: LensExtension, field: string) => ExtensionComponentGuard;

const guardExtensionComponentsInjectable = getInjectable({
  id: "guard-extension-components",

  instantiate: (di): GuardExtensionComponents => {
    const logger = di.inject(loggerInjectionToken);

    return (extension, field) => {
      const logRenderError = (error: Error, errorInfo: ErrorInfo) => {
        logger.error(
          `[EXTENSIONS]: ${extension.name}: a component of "${field}" failed to render and is replaced`,
          error,
          `Component stack:${errorInfo.componentStack ?? " unknown"}`,
        );
      };

      return {
        component: <Props extends object>(
          Component: React.ComponentType<Props>,
          { fallback, resetKey }: GuardComponentOptions<Props>,
        ) => {
          const Boundary = fallback === "view" ? ReportingErrorBoundary : SilentErrorBoundary;

          const Guarded = (props: Props) => (
            <Boundary resetKey={resetKey?.(props)} onError={logRenderError}>
              <Component {...props} />
            </Boundary>
          );

          Guarded.displayName = `ExtensionComponent(${extension.name}, ${field})`;

          return Guarded;
        },

        render:
          <Item extends object>(render: (item: Item) => StrictReactNode) =>
          (item: Item) => {
            let content: StrictReactNode;

            try {
              content = render(item);
            } catch (error) {
              logger.error(
                `[EXTENSIONS]: ${extension.name}: a render callback of "${field}" threw and is skipped`,
                error,
              );

              return null;
            }

            if (!React.isValidElement(content)) {
              return content;
            }

            return (
              <SilentErrorBoundary resetKey={item} onError={logRenderError}>
                {content}
              </SilentErrorBoundary>
            );
          },
      };
    };
  },
});

export default guardExtensionComponentsInjectable;
