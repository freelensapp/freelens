/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  createBrowserHistory,
  createMemoryHistory,
  createObservableHistory,
  observableHistoryInjectionToken,
} from "@freelensapp/routing";
import { createContainer, getInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

import type { HistoryAdapter, ObservableHistory } from "@freelensapp/routing";

import type { RenderResult } from "@testing-library/react";
import type { ComponentType } from "react";

import "@testing-library/jest-dom/vitest";

// A page that throws while it renders for /broken, as a page of an extension can. It reads the path from its props,
// not from the history, so an element of the old location keeps throwing if it is rendered again.
const Page = ({ path }: { path: string }) => {
  if (path === "/broken") {
    throw new Error("Page failed");
  }

  return <p>{`Page at ${path}`}</p>;
};

// Builds the component that renders the boundary, from the history of the test.
type ParentFor = (history: ObservableHistory<unknown>) => ComponentType;

function setup(initialEntries: string[], Parent?: ParentFor) {
  return setupWith(createMemoryHistory({ initialEntries, initialIndex: initialEntries.length - 1 }), Parent);
}

function setupWith(adapter: HistoryAdapter, Parent: ParentFor = routesFor) {
  const di = createContainer("error-boundary-test");

  registerMobX(di);
  di.register(
    getInjectable({
      id: "observable-history-for-test",
      instantiate: () => createObservableHistory(adapter),
      injectionToken: observableHistoryInjectionToken,
    }),
  );

  const history = di.inject(observableHistoryInjectionToken);
  const Component = Parent(history);

  const result: RenderResult = render(
    <DiContextProvider value={di}>
      <Component />
    </DiContextProvider>,
  );

  return { history, result };
}

// The parent picks the page for the location, like the routes around the boundary of the main layout.
const routesFor = (history: ObservableHistory<unknown>) =>
  observer(() => (
    <ErrorBoundary>
      <Page path={history.location.pathname} />
    </ErrorBoundary>
  ));

describe("<ErrorBoundary>", () => {
  beforeEach(() => {
    // React reports every error a boundary catches on the console.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the crash of the page it wraps", () => {
    const { result } = setup(["/broken"]);

    expect(result.getByText("App crash at")).toBeInTheDocument();
    expect(result.getByText(/Page failed/)).toBeInTheDocument();
  });

  it("renders the children again once the location moves to another path", () => {
    const { history, result } = setup(["/broken"]);

    act(() => history.push("/namespaces"));

    expect(result.queryByText("App crash at")).not.toBeInTheDocument();
    expect(result.getByText("Page at /namespaces")).toBeInTheDocument();
  });

  it("keeps the crash while only the search of the location changes", () => {
    const { history, result } = setup(["/broken"]);

    act(() => history.push("/broken?kube-details=x"));

    expect(result.getByText("App crash at")).toBeInTheDocument();
  });

  // The browser history of the app moves back asynchronously, on the popstate event, so the boundary must not render
  // the broken page again in between and catch its error a second time.
  it("goes back to the previous page with the Back button", async () => {
    const user = userEvent.setup();

    window.history.replaceState(null, "", "/pods");
    window.history.pushState(null, "", "/broken");

    const { result } = setupWith(createBrowserHistory({ window }));

    await user.click(result.getByText("Back"));

    await waitFor(() => expect(result.getByText("Page at /pods")).toBeInTheDocument());
    expect(result.queryByText("App crash at")).not.toBeInTheDocument();
  });

  it("shows the crash again when the user comes back to the broken path", () => {
    const { history, result } = setup(["/broken"]);

    act(() => history.push("/pods"));
    act(() => history.push("/broken"));

    expect(result.getByText("App crash at")).toBeInTheDocument();
  });

  // The retry of Back can run before the parent passes the children of the new location. The page that threw
  // throws again then, on the new path, and the children of the new location must still clear the error.
  it("renders the previous page when the parent passes it after the retry of Back", async () => {
    const user = userEvent.setup();
    const shownPath = observable.box("/broken");

    const { history, result } = setup(["/pods", "/broken"], () =>
      observer(() => (
        <ErrorBoundary>
          <Page path={shownPath.get()} />
        </ErrorBoundary>
      )),
    );

    const caughtBefore = vi.mocked(console.error).mock.calls.length;

    await user.click(result.getByText("Back"));

    expect(history.location.pathname).toBe("/pods");
    await waitFor(() => expect(vi.mocked(console.error).mock.calls.length).toBeGreaterThan(caughtBefore));
    expect(result.getByText("App crash at")).toBeInTheDocument();

    act(() => runInAction(() => shownPath.set("/pods")));

    expect(result.queryByText("App crash at")).not.toBeInTheDocument();
    expect(result.getByText("Page at /pods")).toBeInTheDocument();
  });

  // The root frame and the cluster frame render their boundary once and never again on navigation, so Back renders
  // the children again itself, which is a working retry for an error that has gone away.
  it("renders the children again after Back when the parent does not re-render on navigation", async () => {
    const user = userEvent.setup();
    let failing = true;

    const Flaky = () => {
      if (failing) {
        throw new Error("Flaky failed");
      }

      return <p>Flaky content</p>;
    };

    const { history, result } = setup(["/pods", "/cluster"], () => () => (
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    ));

    expect(result.getByText("App crash at")).toBeInTheDocument();

    failing = false;
    await user.click(result.getByText("Back"));

    await waitFor(() => expect(result.getByText("Flaky content")).toBeInTheDocument());
    expect(history.location.pathname).toBe("/pods");
  });

  // The dock passes the content of another tab without a navigation: it renders once Back has moved the history.
  it("renders the children the parent passed without a navigation after Back", async () => {
    const user = userEvent.setup();
    const tab = observable.box("broken");

    const Tab = ({ name }: { name: string }) => {
      if (name === "broken") {
        throw new Error("Tab failed");
      }

      return <p>{`Tab ${name}`}</p>;
    };

    const { result } = setup(["/pods", "/cluster"], () =>
      observer(() => (
        <ErrorBoundary>
          <Tab name={tab.get()} />
        </ErrorBoundary>
      )),
    );

    act(() => runInAction(() => tab.set("logs")));

    expect(result.getByText("App crash at")).toBeInTheDocument();

    await user.click(result.getByText("Back"));

    await waitFor(() => expect(result.getByText("Tab logs")).toBeInTheDocument());
  });
});
