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
import { DiContextProvider, withInjectables } from "@ogre-tools/injectable-react";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

import type { HistoryAdapter, ObservableHistory } from "@freelensapp/routing";
import type { StrictReactNode } from "@freelensapp/utilities";

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

interface LayoutProps {
  resetKey?: string;
  children?: StrictReactNode;
}

// A layout behind `withInjectables`, like the main layout, between the parent that picks the page and the boundary.
// It passes its props on one render late, so the boundary first renders the old page again on every navigation.
const Layout = withInjectables<{}, LayoutProps>(
  observer(({ resetKey, children }: LayoutProps) => <ErrorBoundary resetKey={resetKey}>{children}</ErrorBoundary>),
  { getProps: (_di, props) => props },
);

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

// The parent picks the page for the location and keys its crash by the path, like the layout of the cluster frame.
const routesFor = (history: ObservableHistory<unknown>) =>
  observer(() => {
    const path = history.location.pathname;

    return (
      <Layout resetKey={path}>
        <Page path={path} />
      </Layout>
    );
  });

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

  // The browser history of the app moves back asynchronously, on the popstate event, so Back first renders the broken
  // page again on its own path, which throws again, and then the key of the previous path clears the crash.
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

  // A page that serves every path of one route, like the Helm releases, wraps its content in a boundary of its own, as
  // the second `TabLayout` does. That boundary catches the crash, so the outer one has nothing to clear, and only the
  // key the page passes with its content renders the content again.
  it("renders the content of a page with a boundary of its own again after a change of path within its route", () => {
    const { history, result } = setup(["/releases/broken"], (history) => {
      const Releases = observer(() => {
        const name = history.location.pathname.replace("/releases", "");

        return (
          <Layout resetKey={name}>
            <Page path={name} />
          </Layout>
        );
      });

      return observer(() => (
        <Layout resetKey={history.location.pathname}>
          <Releases />
        </Layout>
      ));
    });

    expect(result.getByText("App crash at")).toBeInTheDocument();

    act(() => history.push("/releases/nginx"));

    expect(result.queryByText("App crash at")).not.toBeInTheDocument();
    expect(result.getByText("Page at /nginx")).toBeInTheDocument();
  });

  // The crash follows the key the parent passes with the children, not the history: a parent that passes the page of
  // the new location only later still gets it rendered.
  it("renders the page the parent passes after Back, with its key", async () => {
    const user = userEvent.setup();
    const shownPath = observable.box("/broken");

    const { history, result } = setup(["/pods", "/broken"], () =>
      observer(() => (
        <Layout resetKey={shownPath.get()}>
          <Page path={shownPath.get()} />
        </Layout>
      )),
    );

    await user.click(result.getByText("Back"));

    expect(history.location.pathname).toBe("/pods");
    expect(result.getByText("App crash at")).toBeInTheDocument();

    act(() => runInAction(() => shownPath.set("/pods")));

    expect(result.queryByText("App crash at")).not.toBeInTheDocument();
    expect(result.getByText("Page at /pods")).toBeInTheDocument();
  });

  // The root frame and the cluster frame render their boundary once, with no key, and never again on navigation, so
  // Back renders the children again itself, which is a working retry for an error that has gone away.
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

    expect(result.getByText("Flaky content")).toBeInTheDocument();
    expect(history.location.pathname).toBe("/pods");
  });

  // The dock passes the content of another tab without a navigation and with no key: Back renders it.
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

    expect(result.getByText("Tab logs")).toBeInTheDocument();
  });
});
