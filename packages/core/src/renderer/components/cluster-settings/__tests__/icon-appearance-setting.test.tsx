/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { KubernetesCluster } from "../../../../common/catalog-entities";
import { Cluster } from "../../../../common/cluster/cluster";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterIconAppearanceSetting } from "../icon-appearance-setting";

import type { UserEvent } from "@testing-library/user-event";

describe("<ClusterIconAppearanceSetting />", () => {
  let cluster: Cluster;
  let user: UserEvent;

  const renderSetting = () => {
    const render = renderFor(getDiForUnitTesting());
    const entity = new KubernetesCluster({
      metadata: {
        labels: {},
        name: "us-west-2-non-prod",
        uid: "some-entity-id",
      },
      spec: {
        kubeconfigContext: "some-context",
        kubeconfigPath: "/some/path/to/kubeconfig",
      },
      status: {
        phase: "connecting",
      },
    });

    render(<ClusterIconAppearanceSetting cluster={cluster} entity={entity} />);
  };

  beforeEach(() => {
    cluster = new Cluster({
      contextName: "some-context",
      id: "some-entity-id",
      kubeConfigPath: "/some/path/to/kubeconfig",
    });
    user = userEvent.setup();
  });

  it("shows the generated initials as the placeholder of the label", () => {
    renderSetting();

    expect(screen.getByTestId("cluster-icon-short-name-input")).toHaveAttribute("placeholder", "UW2");
  });

  it("saves the label when the input loses focus", async () => {
    renderSetting();

    await user.type(screen.getByTestId("cluster-icon-short-name-input"), "W2NP");
    await user.tab();

    expect(cluster.preferences.iconShortName).toBe("W2NP");
  });

  it("limits the label to four characters", async () => {
    renderSetting();

    await user.type(screen.getByTestId("cluster-icon-short-name-input"), "W2NPX");
    await user.tab();

    expect(cluster.preferences.iconShortName).toBe("W2NP");
  });

  it("clears a saved label when the input is emptied", async () => {
    cluster.preferences.iconShortName = "W2NP";
    renderSetting();

    await user.clear(screen.getByTestId("cluster-icon-short-name-input"));
    await user.tab();

    expect(cluster.preferences.iconShortName).toBeNull();
  });

  it("stores the picked color as the icon", async () => {
    renderSetting();

    await user.click(screen.getByTestId("cluster-icon-color-blue"));

    expect(cluster.preferences.icon).toBe("hsl(215, 60%, 27%)");
    expect(screen.getByTestId("cluster-icon-color-blue")).toHaveAttribute("aria-pressed", "true");
  });

  it("goes back to the generated color with Auto", async () => {
    cluster.preferences.icon = "hsl(215, 60%, 27%)";
    renderSetting();

    await user.click(screen.getByTestId("cluster-icon-color-default"));

    expect(cluster.preferences.icon).toBeNull();
  });
});
