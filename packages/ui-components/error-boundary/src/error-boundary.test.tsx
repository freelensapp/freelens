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
import { observer } from "mobx-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

import type { HistoryAdapter } from "@freelensapp/routing";

import type { RenderResult } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

function setup(initialEntries: string[]) {
  return setupWith(createMemoryHistory({ initialEntries, initialIndex: initialEntries.length - 1 }));
}

function setupWith(adapter: HistoryAdapter) {
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

  // A page that throws while it renders for /broken, as a page of an extension can. It reads the path from its
  // props, not from the history, so an element of the old location keeps throwing if it is rendered again.
  const Page = ({ path }: { path: string }) => {
    if (path === "/broken") {
      throw new Error("Page failed");
    }

    return <p>{`Page at ${path}`}</p>;
  };

  // The parent picks the page for the location, like the routes around a boundary of the app.
  const Routes = observer(() => (
    <ErrorBoundary>
      <Page path={history.location.pathname} />
    </ErrorBoundary>
  ));

  const result: RenderResult = render(
    <DiContextProvider value={di}>
      <Routes />
    </DiContextProvider>,
  );

  return { history, result };
}

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
});
