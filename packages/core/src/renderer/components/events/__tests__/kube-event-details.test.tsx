/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import { kubeEventApiInjectable } from "@freelensapp/kube-api-specifics";
import { KubeEvent, Node, Pod } from "@freelensapp/kube-object";
import { screen } from "@testing-library/react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import subscribeStoresInjectable from "../../../kube-watch-api/subscribe-stores.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { KubeEventDetails } from "../kube-event-details";
import eventStoreInjectable from "../store.injectable";

import type { KubeEventData } from "@freelensapp/kube-object";

import type { DiRender } from "../../test-utils/renderFor";

const pod = new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name: "app",
    namespace: "default",
    resourceVersion: "1",
    selfLink: "/api/v1/namespaces/default/pods/app",
    uid: "pod-uid",
  },
});

const eventAbout = (uid: string, name: string, data: Partial<KubeEventData> = {}) =>
  new KubeEvent({
    apiVersion: "v1",
    kind: "Event",
    metadata: {
      name,
      namespace: "default",
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/default/events/${name}`,
      uid: `${name}-uid`,
    },
    involvedObject: {
      apiVersion: "v1",
      kind: "Pod",
      name: "app",
      namespace: "default",
      uid,
      fieldPath: "",
      resourceVersion: "1",
    },
    ...data,
  });

describe("<KubeEventDetails />", () => {
  let render: DiRender;
  let list: ReturnType<typeof vi.fn>;
  let storeEvents: KubeEvent[];

  beforeEach(() => {
    const di = getDiForUnitTesting();

    storeEvents = [];
    list = vi.fn();
    di.override(subscribeStoresInjectable, () => () => () => {});
    di.override(eventStoreInjectable, () => ({ getEventsByObject: () => storeEvents }) as never);
    di.override(kubeEventApiInjectable, () => ({ list }) as never);

    render = renderFor(di);
  });

  it("lists the object's events on its own, as the event store may leave them out", async () => {
    list.mockResolvedValue([
      eventAbout("pod-uid", "oom", {
        type: "Warning",
        reason: "OOMKilling",
        message: "Memory cgroup out of memory",
        lastTimestamp: "2026-11-27T10:00:00Z",
      }),
    ]);

    render(<KubeEventDetails object={pod} />);

    expect(await screen.findByText("Memory cgroup out of memory")).toBeInTheDocument();
    expect(screen.getByText("OOMKilling")).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith({ namespace: "default" }, { fieldSelector: "involvedObject.uid=pod-uid" });
  });

  it("shows an event once when both the store and the listing have it", async () => {
    const event = eventAbout("pod-uid", "backoff", { reason: "BackOff", message: "Back-off restarting" });

    storeEvents = [event];
    list.mockResolvedValue([event]);

    render(<KubeEventDetails object={pod} />);

    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.getAllByText("Back-off restarting")).toHaveLength(1);
  });

  it("leaves out listed events about another object", async () => {
    list.mockResolvedValue([eventAbout("other-uid", "other", { message: "About another pod" })]);

    render(<KubeEventDetails object={pod} />);

    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.queryByText("About another pod")).not.toBeInTheDocument();
  });

  describe("when the object changes", () => {
    const podAt = (resourceVersion: string, uid = "pod-uid") =>
      new Pod({
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name: "app",
          namespace: "default",
          resourceVersion,
          selfLink: "/api/v1/namespaces/default/pods/app",
          uid,
        },
      });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      list.mockResolvedValue([]);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("lists the events again at most once per ten seconds", async () => {
      const { rerender } = render(<KubeEventDetails object={podAt("1")} />);

      rerender(<KubeEventDetails object={podAt("2")} />);
      expect(list).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10_000);
      rerender(<KubeEventDetails object={podAt("3")} />);
      expect(list).toHaveBeenCalledTimes(2);
    });

    it("lists the events of another object at once", () => {
      const { rerender } = render(<KubeEventDetails object={podAt("1")} />);

      rerender(<KubeEventDetails object={podAt("1", "other-uid")} />);

      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  it("lists the events of a node by its name, which its events use as their uid", async () => {
    const node = new Node({
      apiVersion: "v1",
      kind: "Node",
      metadata: { name: "node-1", resourceVersion: "1", selfLink: "/api/v1/nodes/node-1", uid: "node-uid" },
    });

    list.mockResolvedValue([]);

    render(<KubeEventDetails object={node} />);

    await vi.waitFor(() =>
      expect(list).toHaveBeenCalledWith(
        { namespace: "" },
        { fieldSelector: "involvedObject.kind=Node,involvedObject.name=node-1" },
      ),
    );
  });
});
