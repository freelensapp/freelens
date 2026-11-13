/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, waitFor } from "@testing-library/react";
import * as selectEvent from "react-select-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Cluster } from "../../../../common/cluster/cluster";
import requestMetricsProvidersInjectable from "../../../../common/k8s-api/endpoints/metrics.api/request-providers.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterPrometheusSetting } from "../prometheus-setting";

import type { DiRender } from "../../test-utils/renderFor";

describe("ClusterPrometheusSetting with the Mimir provider", () => {
  let render: DiRender;
  let cluster: Cluster;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(requestMetricsProvidersInjectable, () => async () => [
      { id: "mimir", name: "Mimir", isConfigurable: true },
    ]);
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
