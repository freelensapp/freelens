/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Node, Pod } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { PodDetailsList } from "../pod-details-list";
import podStoreInjectable from "../store.injectable";

import type { PodStatus } from "@freelensapp/kube-object";

import type { DiRender } from "../../test-utils/renderFor";
import type { PodStore } from "../store";

const node = new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name: "some-node",
    resourceVersion: "1",
    selfLink: "/api/v1/nodes/some-node",
    uid: "some-node-uid",
  },
});

const podsOnNode = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      new Pod({
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: `some-pod-${index}`,
          namespace: "default",
          resourceVersion: "1",
          selfLink: `/api/v1/namespaces/default/pods/some-pod-${index}`,
          uid: `some-pod-uid-${index}`,
        },
        spec: {
          containers: [{ name: "main" }],
          nodeName: "some-node",
        },
        status: { phase: "Running" } as PodStatus,
      }),
  );

describe("<PodDetailsList />", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    di.override(
      podStoreInjectable,
      () =>
        ({
          isLoaded: true,
          getPodKubeMetrics: () => ({ cpu: 0, memory: 0 }),
          loadKubeMetrics: async () => {},
        }) as unknown as PodStore,
    );

    render = renderFor(di);
  });

  it("shows up to 20 pods as the rows of a plain table", () => {
    const result = render(<PodDetailsList pods={podsOnNode(20)} owner={node} />);

    expect(result.container.querySelector(".PodDetailsList .VirtualList")).toBeNull();
    expect(result.container.querySelectorAll(".PodDetailsList .TableRow")).toHaveLength(20);
  });

  describe("given more than 20 pods", () => {
    // The list of a virtual table takes the height it is given here, whatever the height of
    // the box around it, and the box is laid out by the stylesheet, which these tests do not
    // load (and jsdom has no layout). The box must make room for this height: the
    // application shows whether the rows stay inside the box.
    it("draws the virtual list exactly 20 rows tall", () => {
      const result = render(<PodDetailsList pods={podsOnNode(21)} owner={node} />);
      const list = result.container.querySelector<HTMLElement>(".PodDetailsList .Table.virtual .VirtualList .list");
      const rows = [...result.container.querySelectorAll<HTMLElement>(".PodDetailsList .VirtualList .TableRow")];
      const rowHeights = new Set(rows.map((row) => row.style.height));

      expect(rows).toHaveLength(21);
      expect(rowHeights).toEqual(new Set(["33px"]));
      expect(list?.style.height).toBe(`${20 * 33}px`);
    });
  });
});
