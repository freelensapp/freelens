/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createMemoryHistory } from "history";
import { autorun, runInAction } from "mobx";
import { createObservableHistory } from "./observable-history";
import { searchParamsOptions } from "./search-params";

import type { MemoryHistory } from "history";

import type { ObservableHistory } from "./observable-history";

function createTestObservableHistory(initialEntries: string[] = ["/"]): {
  history: MemoryHistory;
  navigation: ObservableHistory<unknown>;
} {
  const history = createMemoryHistory({ initialEntries, initialIndex: 0 });
  const navigation = createObservableHistory<unknown>(history, {
    searchParams: searchParamsOptions,
  });

  return { history, navigation };
}

describe("ObservableHistory", () => {
  it("reflects the initial location of the underlying history", () => {
    const { navigation } = createTestObservableHistory(["/some-page?foo=bar#tab"]);

    expect(navigation.location.pathname).toBe("/some-page");
    expect(navigation.location.search).toBe("?foo=bar");
    expect(navigation.location.hash).toBe("#tab");
  });

  it("forwards push to the underlying history and updates the observable location", () => {
    const { history, navigation } = createTestObservableHistory(["/first"]);

    navigation.push("/second");

    expect(history.location.pathname).toBe("/second");
    expect(navigation.location.pathname).toBe("/second");
  });

  it("forwards replace without adding a history entry", () => {
    const { history, navigation } = createTestObservableHistory(["/first"]);

    navigation.replace("/second");

    expect(navigation.location.pathname).toBe("/second");
    expect(history.index).toBe(0);
  });

  it("navigates back through the forwarded goBack", () => {
    const { navigation } = createTestObservableHistory(["/first"]);

    navigation.push("/second");
    expect(navigation.location.pathname).toBe("/second");

    navigation.goBack();
    expect(navigation.location.pathname).toBe("/first");
  });

  it("exposes the v4-style length", () => {
    const { navigation } = createTestObservableHistory(["/first"]);

    expect(navigation.length).toBe(1);

    navigation.push("/second");

    expect(navigation.length).toBe(2);
  });

  it("notifies mobx observers when the location changes", () => {
    const { navigation } = createTestObservableHistory(["/first"]);
    const seen: string[] = [];

    const dispose = autorun(() => {
      seen.push(navigation.location.pathname);
    });

    navigation.push("/second");
    navigation.push("/third");

    dispose();

    expect(seen).toEqual(["/first", "/second", "/third"]);
  });

  describe("searchParams", () => {
    it("reflects the current location search", () => {
      const { navigation } = createTestObservableHistory(["/page?foo=bar"]);

      expect(navigation.searchParams.get("foo")).toBe("bar");
    });

    it("updates the location when a param is set", () => {
      const { navigation } = createTestObservableHistory(["/page"]);

      runInAction(() => {
        navigation.searchParams.set("foo", "bar");
      });

      expect(navigation.location.search).toBe("?foo=bar");
    });

    it("updates the location when a param is deleted", () => {
      const { navigation } = createTestObservableHistory(["/page?foo=bar&baz=qux"]);

      runInAction(() => {
        navigation.searchParams.delete("foo");
      });

      expect(navigation.location.search).toBe("?baz=qux");
    });

    it("keeps searchParams in sync when the location search changes via merge", () => {
      const { navigation } = createTestObservableHistory(["/page"]);

      navigation.merge({ search: "?foo=bar" });

      expect(navigation.searchParams.get("foo")).toBe("bar");
    });
  });

  describe("merge", () => {
    it("pushes a new entry by default", () => {
      const { navigation } = createTestObservableHistory(["/page"]);

      navigation.merge({ search: "?foo=bar" });

      expect(navigation.length).toBe(2);
      expect(navigation.location.search).toBe("?foo=bar");
    });

    it("replaces the current entry when replace is true", () => {
      const { history, navigation } = createTestObservableHistory(["/page"]);

      navigation.merge({ hash: "#tab" }, true);

      expect(history.index).toBe(0);
      expect(navigation.location.hash).toBe("#tab");
    });

    it("preserves the current pathname when only the search is merged", () => {
      const { navigation } = createTestObservableHistory(["/page"]);

      navigation.merge({ search: "?foo=bar" });

      expect(navigation.location.pathname).toBe("/page");
    });
  });

  describe("normalize", () => {
    it("strips a lone question mark and hash", () => {
      const { navigation } = createTestObservableHistory();

      expect(navigation.normalize("/page?#").search).toBe("");
      expect(navigation.normalize("/page?#").hash).toBe("");
    });

    it("drops empty entries when skipEmpty is set", () => {
      const { navigation } = createTestObservableHistory();

      const normalized = navigation.normalize({ pathname: "/page", search: "", hash: "#tab" }, { skipEmpty: true });

      expect(normalized).toEqual({ pathname: "/page", hash: "#tab" });
    });
  });

  it("returns the current path from toString", () => {
    const { navigation } = createTestObservableHistory(["/page?foo=bar#tab"]);

    expect(navigation.toString()).toBe("/page?foo=bar#tab");
  });
});
