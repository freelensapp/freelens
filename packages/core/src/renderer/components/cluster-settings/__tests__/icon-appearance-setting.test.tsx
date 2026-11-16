/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { KubernetesCluster } from "../../../../common/catalog-entities";
import { Cluster } from "../../../../common/cluster/cluster";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterIconColorSetting, ClusterIconLabelSetting } from "../icon-appearance-setting";

import type { UserEvent } from "@testing-library/user-event";

const image = "data:image/png;base64,aWNvbg==";

describe("cluster icon appearance settings", () => {
  let cluster: Cluster;
  let user: UserEvent;

  const renderSettings = () => {
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

    render(
      <>
        <ClusterIconLabelSetting cluster={cluster} entity={entity} />
        <ClusterIconColorSetting cluster={cluster} entity={entity} />
      </>,
    );
  };

  beforeEach(() => {
    cluster = new Cluster({
      contextName: "some-context",
      id: "some-entity-id",
      kubeConfigPath: "/some/path/to/kubeconfig",
    });
    user = userEvent.setup();
  });

  describe("label", () => {
    it("shows the generated initials as the placeholder", () => {
      renderSettings();

      expect(screen.getByTestId("cluster-icon-short-name-input")).toHaveAttribute("placeholder", "UW2");
    });

    it("is saved when the input loses focus", async () => {
      renderSettings();

      await user.type(screen.getByTestId("cluster-icon-short-name-input"), "W2N");
      await user.tab();

      expect(cluster.preferences.iconShortName).toBe("W2N");
    });

    it("is limited to three characters", async () => {
      renderSettings();

      await user.type(screen.getByTestId("cluster-icon-short-name-input"), "W2NP");
      await user.tab();

      expect(cluster.preferences.iconShortName).toBe("W2N");
    });

    it("is cleared when the input is emptied", async () => {
      cluster.preferences.iconShortName = "W2N";
      renderSettings();

      await user.clear(screen.getByTestId("cluster-icon-short-name-input"));
      await user.tab();

      expect(cluster.preferences.iconShortName).toBeNull();
    });

    it("follows a label saved elsewhere", async () => {
      renderSettings();

      runInAction(() => {
        cluster.preferences.iconShortName = "E1P";
      });

      await waitFor(() => expect(screen.getByTestId("cluster-icon-short-name-input")).toHaveValue("E1P"));
    });
  });

  describe("color", () => {
    it("stores the picked color as the icon", async () => {
      renderSettings();

      await user.click(screen.getByTestId("cluster-icon-color-blue"));

      expect(cluster.preferences.icon).toBe("hsl(215, 60%, 27%)");
      expect(screen.getByTestId("cluster-icon-color-blue")).toHaveAttribute("aria-pressed", "true");
    });

    it("goes back to the generated color with Auto", async () => {
      cluster.preferences.icon = "hsl(215, 60%, 27%)";
      renderSettings();

      await user.click(screen.getByTestId("cluster-icon-color-default"));

      expect(cluster.preferences.icon).toBeNull();
    });

    it("stores a picked image as the icon with Icon", async () => {
      renderSettings();

      await user.upload(
        screen.getByTestId("cluster-icon-image-input"),
        new File(["icon"], "icon.png", { type: "image/png" }),
      );

      await waitFor(() => expect(cluster.preferences.icon).toBe(image));
      expect(screen.getByTestId("cluster-icon-image")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("cluster-icon-color-default")).toHaveAttribute("aria-pressed", "false");
    });

    it("replaces an image with a picked color", async () => {
      cluster.preferences.icon = image;
      renderSettings();

      await user.click(screen.getByTestId("cluster-icon-color-green"));

      expect(cluster.preferences.icon).toBe("hsl(125, 60%, 27%)");
    });

    it("stores a hex code entered under Custom", async () => {
      renderSettings();

      await user.click(screen.getByTestId("cluster-icon-color-custom"));
      await user.clear(screen.getByTestId("cluster-icon-color-custom-hex"));
      await user.type(screen.getByTestId("cluster-icon-color-custom-hex"), "123456{Enter}");

      expect(cluster.preferences.icon).toBe("#123456");
      expect(screen.getByTestId("cluster-icon-color-custom")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("cluster-icon-color-default")).toHaveAttribute("aria-pressed", "false");
    });

    it.each([
      ["cluster-icon-color-blue", "Blue"],
      ["cluster-icon-color-default", "name of the cluster"],
      ["cluster-icon-color-custom", "hex code"],
      ["cluster-icon-image", "image instead of a solid color"],
    ])("describes %s in a tooltip", (testId, text) => {
      renderSettings();

      expect(screen.getByTestId(`tooltip-content-for-${testId}`)).toHaveTextContent(text);
    });

    it("does not mark Custom for a listed color or an image", () => {
      cluster.preferences.icon = image;
      renderSettings();

      expect(screen.getByTestId("cluster-icon-color-custom")).toHaveAttribute("aria-pressed", "false");
    });

    it("replaces an image with the generated color with Auto", async () => {
      cluster.preferences.icon = image;
      renderSettings();

      await user.click(screen.getByTestId("cluster-icon-color-default"));

      expect(cluster.preferences.icon).toBeNull();
    });
  });
});
