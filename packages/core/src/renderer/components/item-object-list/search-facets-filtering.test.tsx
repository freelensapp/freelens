/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";

import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import facetsUrlPageParamInjectable from "../input/facets-url-page-param.injectable";
import { serializeFacets } from "../input/search-facets";
import searchOperatorUrlPageParamInjectable from "../input/search-operator-url-page-param.injectable";
import searchUrlPageParamInjectable from "../input/search-url-page-param.injectable";
import { renderFor } from "../test-utils/renderFor";
import { ItemListLayout } from "./list-layout";

import type { ItemObject } from "@freelensapp/list-layout";

import type { DiContainer } from "@ogre-tools/injectable";

import type { FacetOperator, SearchFacet } from "../input/search-facets";

interface TestItem extends ItemObject {
  namespace: string;
  status: string;
  labels: string[];
}

const item = (name: string, namespace: string, status: string, labels: string[]): TestItem => ({
  getId: () => name,
  getName: () => name,
  namespace,
  status,
  labels,
});

const items = [
  item("prod-api-7d9f", "default", "Running", ["app=api"]),
  item("prod-web-2b1c", "kube-system", "Running", ["app=web"]),
  item("staging-api-4a8e", "default", "Pending", ["app=api"]),
  item("dev-worker-1f2a", "kube-system", "Failed", ["app=worker"]),
];

const store = {
  isLoaded: true,
  failedLoading: false,
  getTotalCount: () => items.length,
  isSelected: () => false,
  toggleSelection: () => {},
  isSelectedAll: () => false,
  toggleSelectionAll: () => {},
  pickOnlySelected: () => [],
  removeSelectedItems: async () => {},
  loadAll: async () => {},
};

describe("filtering by search facets", () => {
  let di: DiContainer;
  let render: ReturnType<typeof renderFor>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    render = renderFor(di);
  });

  const setFacets = (facets: SearchFacet[]) => di.inject(facetsUrlPageParamInjectable).set(serializeFacets(facets));
  const setSearch = (query: string) => di.inject(searchUrlPageParamInjectable).set(query);
  const setSearchOperator = (op: FacetOperator) => di.inject(searchOperatorUrlPageParamInjectable).set(op);

  const renderList = () =>
    render(
      <ItemListLayout<TestItem, false>
        className="TestItems"
        store={store}
        getItems={() => items}
        preloadStores={false}
        virtual={false}
        renderHeaderTitle="Test items"
        searchFields={[
          { id: "name", title: "Name", getValue: (i) => i.getName() },
          { id: "namespace", title: "Namespace", getValue: (i) => i.namespace },
          { id: "status", title: "Status", getValue: (i) => i.status },
          { id: "labels", title: "Labels", getValue: (i) => i.labels },
        ]}
        renderTableContents={(i) => [i.getName()]}
      />,
    );

  const visibleNames = (container: HTMLElement) =>
    items.map((i) => i.getName()).filter((name) => container.textContent?.includes(name));

  it("shows everything when no facet is set", () => {
    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(items.map((i) => i.getName()));
  });

  it("restricts a facet to its own field", () => {
    // "default" is a namespace, never part of a name, so a Name facet must miss.
    setFacets([{ field: "name", values: ["default"] }]);

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual([]);
  });

  it("matches within the named field", () => {
    setFacets([{ field: "namespace", values: ["default"] }]);

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "staging-api-4a8e"]);
  });

  it("ORs several values inside one facet", () => {
    setFacets([{ field: "status", values: ["Pending", "Failed"] }]);

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(["staging-api-4a8e", "dev-worker-1f2a"]);
  });

  it("ANDs separate facets", () => {
    setFacets([
      { field: "namespace", values: ["default"] },
      { field: "status", values: ["Running"] },
    ]);

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f"]);
  });

  it("combines three facets", () => {
    setFacets([
      { field: "namespace", values: ["default"] },
      { field: "status", values: ["Running", "Pending"] },
      { field: "labels", values: ["app=api"] },
    ]);

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "staging-api-4a8e"]);
  });

  it("ANDs the plain search box on top of the facets", () => {
    setFacets([{ field: "namespace", values: ["kube-system"] }]);
    setSearch("worker");

    const { baseElement } = renderList();

    expect(visibleNames(baseElement)).toEqual(["dev-worker-1f2a"]);
  });

  describe("a facet naming a field this view does not have", () => {
    // The linked search carries facets across views, so this is routine rather
    // than exotic. Applying it would empty the list for a positive operator and
    // filter nothing for a negative one - the same chip looking broken or
    // lying depending on its operator. It is skipped instead, and the chip is
    // struck through so the list is never silently unfiltered.
    it("is skipped rather than matching nothing", () => {
      setFacets([{ field: "node", values: ["worker-1"] }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(items.map((i) => i.getName()));
    });

    it("is skipped for a negative operator too", () => {
      setFacets([{ field: "node", values: ["worker-1"], op: "notContains" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(items.map((i) => i.getName()));
    });

    it("leaves the facets that do apply working", () => {
      setFacets([
        { field: "node", values: ["worker-1"] },
        { field: "namespace", values: ["default"] },
      ]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "staging-api-4a8e"]);
    });
  });

  describe("operators", () => {
    it("filters on an exact value with equals", () => {
      // "default" is also a substring of nothing else here, so use a status
      // where contains and equals genuinely differ.
      setFacets([{ field: "status", values: ["Run"], op: "equals" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual([]);
    });

    it("matches the full value with equals", () => {
      setFacets([{ field: "status", values: ["Running"], op: "equals" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "prod-web-2b1c"]);
    });

    it("excludes with does-not-contain", () => {
      setFacets([{ field: "name", values: ["api"], op: "notContains" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
    });

    it("excludes with not-equals", () => {
      setFacets([{ field: "namespace", values: ["default"], op: "notEquals" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
    });

    it("ANDs a positive and a negative facet", () => {
      setFacets([
        { field: "status", values: ["Running"], op: "equals" },
        { field: "name", values: ["web"], op: "notContains" },
      ]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f"]);
    });

    it("keeps two operators on the same field as independent filters", () => {
      setFacets([
        { field: "name", values: ["prod"], op: "contains" },
        { field: "name", values: ["web"], op: "notContains" },
      ]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f"]);
    });

    it("excludes an item when one of a field's many texts matches a negative", () => {
      setFacets([{ field: "labels", values: ["app=api"], op: "notContains" }]);

      const { baseElement } = renderList();

      expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
    });

    describe("regular expressions", () => {
      it("honours anchors with matches", () => {
        setFacets([{ field: "name", values: ["^prod"], op: "matches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "prod-web-2b1c"]);
      });

      it("is unanchored unless the pattern says otherwise", () => {
        setFacets([{ field: "name", values: ["api"], op: "matches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "staging-api-4a8e"]);
      });

      it("honours alternation", () => {
        setFacets([{ field: "name", values: ["^(staging|dev)-"], op: "matches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["staging-api-4a8e", "dev-worker-1f2a"]);
      });

      it("excludes with notMatches", () => {
        setFacets([{ field: "name", values: ["^prod"], op: "notMatches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["staging-api-4a8e", "dev-worker-1f2a"]);
      });

      it("mixes a regex facet with a literal one", () => {
        setFacets([
          { field: "name", values: ["-api-"], op: "contains" },
          { field: "namespace", values: ["^default$"], op: "matches" },
        ]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "staging-api-4a8e"]);
      });

      it("filters nothing while the pattern is still incomplete", () => {
        setFacets([{ field: "name", values: ["^(prod"], op: "matches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(items.map((i) => i.getName()));
      });

      it("applies character classes, which lowercasing the source would break", () => {
        setFacets([{ field: "namespace", values: ["^[a-z]+-[a-z]+$"], op: "matches" }]);

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
      });
    });

    describe("the plain search box", () => {
      it("is literal by default, so metacharacters match nothing", () => {
        setSearch("^prod");

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual([]);
      });

      it("matches as a substring across every field", () => {
        setSearch("kube-system");

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
      });

      // Picking an operator has to re-filter straight away, not wait for a chip.
      it("applies the armed operator to the text being typed", () => {
        setSearch("^prod");
        setSearchOperator("matches");

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "prod-web-2b1c"]);
      });

      it("applies a negative operator to the text being typed", () => {
        setSearch("api");
        setSearchOperator("notContains");

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-web-2b1c", "dev-worker-1f2a"]);
      });

      it("falls back to contains for an unknown operator in the param", () => {
        setSearch("prod-");
        di.inject(searchOperatorUrlPageParamInjectable).set("startsWith");

        const { baseElement } = renderList();

        expect(visibleNames(baseElement)).toEqual(["prod-api-7d9f", "prod-web-2b1c"]);
      });
    });
  });
});
