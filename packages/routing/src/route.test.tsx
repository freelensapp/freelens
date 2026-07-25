/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { DiContextProvider } from "@ogre-tools/injectable-react";
import { render, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { routingFeature } from "./feature";
import { historyInjectable } from "./history.injectable";
import { observableHistoryInjectionToken } from "./observable-history.injectable";
import { Redirect, Route, Switch } from "./route";

import type { RenderResult } from "@testing-library/react";

import type { ObservableHistory } from "./observable-history";

import "@testing-library/jest-dom/vitest";

function setup(initialEntries: string[] = ["/"]) {
  const di = createContainer("routing-route-test");

  registerMobX(di);
  registerFeature(di, routingFeature);

  const memoryHistory = createMemoryHistory({ initialEntries, initialIndex: 0 });

  di.override(historyInjectable, () => memoryHistory);

  const history = di.inject(observableHistoryInjectionToken) as ObservableHistory;
  const renderInContext = (ui: React.ReactElement): RenderResult =>
    render(<DiContextProvider value={di}>{ui}</DiContextProvider>);

  return { di, history, renderInContext };
}

const Panel = ({ label }: { label: string }) => <div>{label}</div>;

describe("routing <Route>", () => {
  it("renders its component when the path matches", () => {
    const { renderInContext } = setup(["/foo"]);
    const result = renderInContext(<Route path="/foo" component={() => <Panel label="foo" />} />);

    expect(result.queryByText("foo")).toBeInTheDocument();
  });

  it("renders nothing when the path does not match", () => {
    const { renderInContext } = setup(["/bar"]);
    const result = renderInContext(<Route path="/foo" component={() => <Panel label="foo" />} />);

    expect(result.queryByText("foo")).not.toBeInTheDocument();
  });

  it("matches by prefix unless `exact` is set", () => {
    const { renderInContext } = setup(["/foo/bar"]);
    const prefix = renderInContext(<Route path="/foo" component={() => <Panel label="prefix" />} />);

    expect(prefix.queryByText("prefix")).toBeInTheDocument();
  });

  it("does not match a longer pathname when `exact` is set", () => {
    const { renderInContext } = setup(["/foo/bar"]);
    const exact = renderInContext(<Route exact path="/foo" component={() => <Panel label="exact" />} />);

    expect(exact.queryByText("exact")).not.toBeInTheDocument();
  });

  it("passes the match params to a render prop", () => {
    const { renderInContext } = setup(["/clusters/123"]);
    const result = renderInContext(
      <Route
        path="/clusters/:id"
        render={({ match }) => <Panel label={(match?.params as { id?: string })?.id ?? "none"} />}
      />,
    );

    expect(result.queryByText("123")).toBeInTheDocument();
  });
});

describe("routing <Switch>", () => {
  it("renders the first matching route (first-match-wins)", () => {
    const { renderInContext } = setup(["/foo"]);
    const result = renderInContext(
      <Switch>
        <Route path="/foo" component={() => <Panel label="first" />} />
        <Route path="/foo" component={() => <Panel label="second" />} />
      </Switch>,
    );

    expect(result.queryByText("first")).toBeInTheDocument();
    expect(result.queryByText("second")).not.toBeInTheDocument();
  });

  it("skips non-matching routes and renders a later match", () => {
    const { renderInContext } = setup(["/bar"]);
    const result = renderInContext(
      <Switch>
        <Route exact path="/foo" component={() => <Panel label="foo" />} />
        <Route exact path="/bar" component={() => <Panel label="bar" />} />
      </Switch>,
    );

    expect(result.queryByText("foo")).not.toBeInTheDocument();
    expect(result.queryByText("bar")).toBeInTheDocument();
  });

  it("falls back to a trailing <Redirect> when no route matches", async () => {
    const { history, renderInContext } = setup(["/unknown"]);

    renderInContext(
      <Switch>
        <Route exact path="/foo" component={() => <Panel label="foo" />} />
        <Redirect to="/foo" />
      </Switch>,
    );

    await waitFor(() => expect(history.location.pathname).toBe("/foo"));
  });

  it("does not trigger the fallback redirect when a route matches", async () => {
    const { history, renderInContext } = setup(["/foo"]);

    renderInContext(
      <Switch>
        <Route exact path="/foo" component={() => <Panel label="foo" />} />
        <Redirect to="/bar" />
      </Switch>,
    );

    await waitFor(() => expect(history.location.pathname).toBe("/foo"));
    expect(history.location.pathname).toBe("/foo");
  });
});

describe("routing <Redirect>", () => {
  it("replaces the current entry by default", async () => {
    const { history, renderInContext } = setup(["/start"]);

    renderInContext(<Redirect to="/target" />);

    await waitFor(() => expect(history.location.pathname).toBe("/target"));
    expect(history.action).toBe("REPLACE");
  });

  it("pushes a new entry when `push` is set", async () => {
    const { history, renderInContext } = setup(["/start"]);

    renderInContext(<Redirect to="/target" push />);

    await waitFor(() => expect(history.location.pathname).toBe("/target"));
    expect(history.action).toBe("PUSH");
  });
});
