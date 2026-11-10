/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./error-boundary.scss";

import { Button } from "@freelensapp/button";
import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";

import type { ObservableHistory } from "@freelensapp/routing";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { ErrorInfo } from "react";

const issuesTrackerUrl = "https://github.com/freelensapp/freelens/issues";

export interface ErrorBoundaryProps {
  children?: StrictReactNode;
  /**
   * Clears the crash of the children when it changes, e.g. the path of the page the children render. The parent
   * passes it with the children, from the same render. A key read anywhere else, such as from the history, runs ahead
   * of the children: `withInjectables` hands props on one render late, so on a navigation the boundary first renders
   * the old children once more.
   */
  resetKey?: string;
}

interface State {
  error?: Error;
  errorInfo?: ErrorInfo;
  resetKey?: string;
}

interface Dependencies {
  observableHistory: ObservableHistory<unknown>;
}

@observer
class NonInjectedErrorBoundary extends React.Component<ErrorBoundaryProps & Dependencies, State> {
  public state: State = {};

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: undefined, errorInfo: undefined, resetKey: props.resetKey };
    }

    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  back = () => {
    this.setState({ error: undefined, errorInfo: undefined });
    this.props.observableHistory.goBack();
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
