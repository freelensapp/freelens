/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Cluster } from "../../../common/cluster/cluster";
import { NonInjectedClusterStatus } from "./cluster-status";

import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";

vi.mock("../../../common/ipc", () => ({
  ipcRendererOn: vi.fn(() => vi.fn()),
}));

vi.mock("@freelensapp/icon", () => ({
  Icon: () => null,
}));

describe("ClusterStatus", () => {
  function renderStatus() {
    const navigateToCatalog = vi.fn();
    let component: NonInjectedClusterStatus | null = null;
    const cluster = new Cluster({
      contextName: "some-context",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path/to/kubeconfig",
    });

    cluster.disconnected.set(false);

    render(
      <NonInjectedClusterStatus
        ref={(instance) => {
          component = instance;
        }}
        cluster={cluster}
        navigateToCatalog={navigateToCatalog}
        navigateToEntitySettings={vi.fn()}
        requestClusterActivation={vi.fn(async () => {})}
        entityRegistry={{ getById: () => undefined } as unknown as CatalogEntityRegistry}
      />,
    );

    if (!component) {
      throw new Error("ClusterStatus did not mount");
    }

    return {
      cluster,
      component: component as NonInjectedClusterStatus,
      navigateToCatalog,
    };
  }

  it("allows returning to the catalog after the cluster becomes disconnected", async () => {
    const { cluster, navigateToCatalog } = renderStatus();

    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Catalog" })).not.toBeInTheDocument();

    act(() => cluster.disconnected.set(true));

    await userEvent.click(screen.getByRole("button", { name: "Back to Catalog" }));

    expect(navigateToCatalog).toHaveBeenCalledOnce();
  });

  it("keeps the existing recovery actions when connection errors are reported", () => {
    const { cluster, component } = renderStatus();

    act(() => {
      cluster.disconnected.set(true);
      component.authOutput.push({ level: "error", message: "Unable to reach cluster" });
    });

    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
    expect(screen.getByText("Manage Proxy Settings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Catalog" })).toBeInTheDocument();
  });
});
