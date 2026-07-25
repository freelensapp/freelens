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
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";
import React, { createRef } from "react";
import { routingFeature } from "./feature";
import { historyInjectable } from "./history.injectable";
import { Link, NavLink } from "./link";
import { observableHistoryInjectionToken } from "./observable-history.injectable";

import type { RenderResult } from "@testing-library/react";

import type { ObservableHistory } from "./observable-history";

import "@testing-library/jest-dom/vitest";

function setup(initialEntries: string[] = ["/"]) {
  const di = createContainer("routing-link-test");

  registerMobX(di);
  registerFeature(di, routingFeature);

  const memoryHistory = createMemoryHistory({ initialEntries, initialIndex: 0 });

  di.override(historyInjectable, () => memoryHistory);

  const history = di.inject(observableHistoryInjectionToken) as ObservableHistory;
  const renderInContext = (ui: React.ReactElement): RenderResult =>
    render(<DiContextProvider value={di}>{ui}</DiContextProvider>);

  return { di, history, renderInContext };
}

describe("routing <Link>", () => {
  it("renders an anchor whose href resolves through the history", () => {
    const { renderInContext } = setup();
    const result = renderInContext(<Link to="/foo">go</Link>);

    expect(result.getByText("go").closest("a")).toHaveAttribute("href", "/foo");
  });

  it("navigates on a plain left click without a full page reload", async () => {
    const user = userEvent.setup();
    const { history, renderInContext } = setup();
    const result = renderInContext(<Link to="/foo">go</Link>);

    await user.click(result.getByText("go"));

    expect(history.location.pathname).toBe("/foo");
  });

  it("does not navigate when a modifier key is held", async () => {
    const user = userEvent.setup();
    const { history, renderInContext } = setup(["/start"]);
    const result = renderInContext(<Link to="/foo">go</Link>);

    await user.keyboard("{Meta>}");
    await user.click(result.getByText("go"));
    await user.keyboard("{/Meta}");

    expect(history.location.pathname).toBe("/start");
  });

  it("replaces the current entry when `replace` is set", async () => {
    const user = userEvent.setup();
    const { history, renderInContext } = setup(["/start"]);
    const result = renderInContext(
      <Link to="/foo" replace>
        go
      </Link>,
    );

    await user.click(result.getByText("go"));

    expect(history.location.pathname).toBe("/foo");
    expect(history.action).toBe("REPLACE");
  });

  it("still calls a supplied onClick handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { renderInContext } = setup();
    const result = renderInContext(
      <Link to="/foo" onClick={onClick}>
        go
      </Link>,
    );

    await user.click(result.getByText("go"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a ref to the underlying anchor", () => {
    const ref = createRef<HTMLAnchorElement>();
    const { renderInContext } = setup();

    renderInContext(
      <Link to="/foo" ref={ref}>
        go
      </Link>,
    );

    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
});

describe("routing <NavLink>", () => {
  it("adds the active class when the current location matches `to`", () => {
    const { renderInContext } = setup(["/foo"]);
    const result = renderInContext(
      <NavLink to="/foo" className="item">
        go
      </NavLink>,
    );

    expect(result.getByText("go").closest("a")).toHaveClass("item", "active");
  });

  it("omits the active class when the location does not match", () => {
    const { renderInContext } = setup(["/bar"]);
    const result = renderInContext(
      <NavLink to="/foo" className="item">
        go
      </NavLink>,
    );

    const anchor = result.getByText("go").closest("a");

    expect(anchor).toHaveClass("item");
    expect(anchor).not.toHaveClass("active");
  });

  it("honors an `isActive` override", () => {
    const { renderInContext } = setup(["/bar"]);
    const result = renderInContext(
      <NavLink to="/foo" className="item" isActive={() => true}>
        go
      </NavLink>,
    );

    expect(result.getByText("go").closest("a")).toHaveClass("active");
  });

  it("reacts to location changes", async () => {
    const { history, renderInContext } = setup(["/bar"]);
    const result = renderInContext(
      <NavLink to="/foo" className="item">
        go
      </NavLink>,
    );

    expect(result.getByText("go").closest("a")).not.toHaveClass("active");

    history.push("/foo");

    await waitFor(() => expect(result.getByText("go").closest("a")).toHaveClass("active"));
  });
});
