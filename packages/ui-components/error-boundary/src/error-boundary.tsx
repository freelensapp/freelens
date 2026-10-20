/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./error-boundary.scss";

import { Button } from "@freelensapp/button";
import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { withInjectables } from "@ogre-tools/injectable-react";
import { when } from "mobx";
import { observer } from "mobx-react";
import React from "react";

import type { ObservableHistory } from "@freelensapp/routing";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { ErrorInfo, GetDerivedStateFromProps } from "react";

const issuesTrackerUrl = "https://github.com/freelensapp/freelens/issues";

export interface ErrorBoundaryProps {
  children?: StrictReactNode;
}

interface State {
  error?: Error;
  errorInfo?: ErrorInfo;
  /**
   * The path the error was thrown on, and the children that threw it. The error belongs to that page: once the
   * location moves to another path and the parent passes other children, they render. The retry of Back keeps both.
   */
  pathname?: string;
  children?: StrictReactNode;
}

interface Dependencies {
  observableHistory: ObservableHistory<unknown>;
}

@observer
class NonInjectedErrorBoundary extends React.Component<ErrorBoundaryProps & Dependencies, State> {
  public state: State = {};

  // The error is cleared when the parent passes the children of another location. Neither check is enough alone: on
  // a navigation the boundary can render once more with the children that threw before the new ones arrive (as
  // `withInjectables` does on the way back), and the parent can re-render the same page with new elements.
  static getDerivedStateFromProps: GetDerivedStateFromProps<ErrorBoundaryProps & Dependencies, State> = (
    props,
    state,
  ) => {
    if (
      state.error &&
      state.pathname !== props.observableHistory.location.pathname &&
      state.children !== props.children
    ) {
      return { error: undefined, errorInfo: undefined, pathname: undefined, children: undefined };
    }

    return null;
  };

  private disposeBackRetry?: () => void;

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { children, observableHistory } = this.props;

    // When the retry of Back renders the children that threw once more, and they throw again, the error keeps the
    // path they first threw on. Otherwise a retry that runs on the new path before the parent passes the children of
    // the new location would record the new path, and those children would never clear the error.
    this.setState((state) => ({
      error,
      errorInfo,
      pathname: (state.children === children ? state.pathname : undefined) ?? observableHistory.location.pathname,
      children,
    }));
  }

  componentWillUnmount() {
    this.disposeBackRetry?.();
  }

  // Back goes back, and once the history has moved, renders the children again if the error is still on screen. A
  // parent that follows the location has passed the children of the new location by then, and they have cleared the
  // error; a parent that does not re-render on navigation (the root frame, the cluster frame, the dock) has not, and
  // the retry is what renders its children again. The retry waits for a task, so that the parent re-renders first.
  back = () => {
    const { observableHistory } = this.props;
    const { error } = this.state;
    const location = observableHistory.location;

    this.disposeBackRetry?.();

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const disposeWhen = when(
      () => observableHistory.location !== location,
      () => {
        timeout = setTimeout(() => {
          this.disposeBackRetry = undefined;

          if (this.state.error === error) {
            this.setState({ error: undefined, errorInfo: undefined });
          }
        });
      },
    );

    this.disposeBackRetry = () => {
      disposeWhen();
      clearTimeout(timeout);
    };

    observableHistory.goBack();
  };

  render() {
    const { error, errorInfo } = this.state;

    if (error) {
      return (
        <div className="ErrorBoundary">
          <h5>
            {"App crash at "}
            <span className="contrast">{window.location.pathname}</span>
          </h5>
          <p>
            {"To help us improve the product please report bugs on "}
            <a href={issuesTrackerUrl} rel="noreferrer" target="_blank">
              Github
            </a>
            {" issues tracker."}
          </p>
          <div className="wrapper">
            <code className="block">
              <p className="contrast">Component stack:</p>
              {errorInfo?.componentStack}
            </code>
            <code className="block">
              <p className="contrast">Error stack:</p>
              {error.stack}
            </code>
          </div>
          <Button className="back-button" primary label="Back" onClick={this.back} />
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withInjectables<Dependencies, ErrorBoundaryProps>(NonInjectedErrorBoundary, {
  getProps: (di, props) => ({
    ...props,
    observableHistory: di.inject(observableHistoryInjectionToken),
  }),
});
