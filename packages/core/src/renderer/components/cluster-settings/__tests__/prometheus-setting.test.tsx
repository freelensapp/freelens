/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { gmpFrontendDocumentationUrl } from "@freelensapp/prometheus";
import userEvent from "@testing-library/user-event";
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
