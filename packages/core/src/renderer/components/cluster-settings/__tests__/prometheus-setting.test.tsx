/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gmpFrontendDocumentationUrl } from "@freelensapp/prometheus";
import { fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as selectEvent from "react-select-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../../../common/cluster/cluster";
import requestMetricsProvidersInjectable from "../../../../common/k8s-api/endpoints/metrics.api/request-providers.injectable";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterPrometheusSetting } from "../prometheus-setting";

import type { Mock } from "vitest";

import type { DiRender } from "../../test-utils/renderFor";

describe("ClusterPrometheusSetting", () => {
  let render: DiRender;
  let openLinkInBrowser: Mock;

  const clusterWithProvider = (type?: string) =>
    new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
      preferences: type ? { prometheusProvider: { type } } : {},
    });

  beforeEach(() => {
    const di = getDiForUnitTesting();

    openLinkInBrowser = vi.fn(async () => {});

    di.override(requestMetricsProvidersInjectable, () => async () => [
      { id: "operator", name: "Prometheus Operator", isConfigurable: true },
      { id: "gke", name: "Google Managed Prometheus", isConfigurable: true },
    ]);
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowser);

    render = renderFor(di);
  });

  it("shows the hint for the GMP frontend and its link when the GKE provider is selected", async () => {
    const dom = render(<ClusterPrometheusSetting cluster={clusterWithProvider("gke")} />);
    const hint = await dom.findByTestId("cluster-prometheus-gke-hint");

    expect(hint.textContent).toContain("gke.gcr.io/prometheus-engine/frontend");
    expect(hint.textContent).toContain("gmp-public, gmp-system, monitoring, default");

    const link = dom.getByText("the Google Cloud documentation");

    expect(link.getAttribute("href")).toBe(gmpFrontendDocumentationUrl);
  });

  it("opens the link in the browser", async () => {
    const dom = render(<ClusterPrometheusSetting cluster={clusterWithProvider("gke")} />);
    const link = await dom.findByText("the Google Cloud documentation");

    await userEvent.setup().click(link);

    expect(openLinkInBrowser).toHaveBeenCalledWith(gmpFrontendDocumentationUrl);
  });

  it("shows the generic hint for another provider", async () => {
    const dom = render(<ClusterPrometheusSetting cluster={clusterWithProvider("operator")} />);

    expect(await dom.findByText(/tries to auto-detect address if left empty/)).toBeDefined();
    expect(dom.queryByTestId("cluster-prometheus-gke-hint")).toBeNull();
  });

  it("shows no hint for the GMP frontend with Auto Detect", async () => {
    const dom = render(<ClusterPrometheusSetting cluster={clusterWithProvider()} />);

    expect(await dom.findByText("Auto Detect Prometheus")).toBeDefined();
    expect(dom.queryByTestId("cluster-prometheus-gke-hint")).toBeNull();
  });
});

describe("ClusterPrometheusSetting with the Mimir provider", () => {
  let render: DiRender;
  let cluster: Cluster;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(requestMetricsProvidersInjectable, () => async () => [
      { id: "mimir", name: "Mimir", isConfigurable: true },
    ]);
    di.override(openLinkInBrowserInjectable, () => async () => {});
    render = renderFor(di);
    cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
      preferences: {
        prometheusProvider: { type: "mimir" },
        prometheus: {
          namespace: "mimir",
          service: "mimir-query-frontend",
          port: 8080,
          prefix: "/prometheus",
          customHeaders: { "X-Scope-OrgID": "anonymous" },
        },
      },
    });
  });

  it("keeps the settings when switching to the external URL, and saves the URL once it is typed", async () => {
    const dom = render(<ClusterPrometheusSetting cluster={cluster} />);

    await waitFor(() => expect(dom.container.querySelector("#mimir-connection-mode")).not.toBeNull());
    // The menu of the select is in a portal on document.body.
    await selectEvent.select(dom.container.querySelector<HTMLElement>("#mimir-connection-mode")!, "External URL", {
      container: document.body,
    });

    const url = await dom.findByPlaceholderText("https://mimir.example.com");

    expect(cluster.preferences.prometheus).toMatchObject({
      namespace: "mimir",
      service: "mimir-query-frontend",
      prefix: "/prometheus",
      customHeaders: { "X-Scope-OrgID": "anonymous" },
    });

    fireEvent.change(url, { target: { value: "http://mimir.example.com" } });
    fireEvent.blur(url);

    expect(cluster.preferences.prometheus).toMatchObject({
      directUrl: "http://mimir.example.com",
      prefix: "/prometheus",
      customHeaders: { "X-Scope-OrgID": "anonymous" },
    });
    expect(dom.getByPlaceholderText("https://mimir.example.com")).toBeInTheDocument();
  });

  it("goes back to the in-cluster service without the external URL", async () => {
    cluster.preferences.prometheus = {
      ...cluster.preferences.prometheus!,
      directUrl: "http://mimir.example.com",
    };

    const dom = render(<ClusterPrometheusSetting cluster={cluster} />);

    await dom.findByPlaceholderText("https://mimir.example.com");
    await selectEvent.select(
      dom.container.querySelector<HTMLElement>("#mimir-connection-mode")!,
      "In-cluster K8s service",
      { container: document.body },
    );

    expect(await dom.findByDisplayValue("mimir/mimir-query-frontend:8080")).toBeInTheDocument();
    expect(cluster.preferences.prometheus).toMatchObject({ namespace: "mimir", prefix: "/prometheus" });
    expect(cluster.preferences.prometheus?.directUrl).toBeUndefined();
  });
});
