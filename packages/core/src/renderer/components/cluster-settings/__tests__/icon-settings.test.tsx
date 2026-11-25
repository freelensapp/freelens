/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterIconSettingsComponentInjectionToken } from "@freelensapp/cluster-settings";
import { type DiContainer, getInjectable } from "@ogre-tools/injectable";
import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { KubernetesCluster } from "../../../../common/catalog-entities";
import { Cluster } from "../../../../common/cluster/cluster";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterIconSetting } from "../icon-settings";

import type { ClusterIconSettingComponentProps } from "@freelensapp/cluster-settings";

import type { RenderResult } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

function CustomSettingsComponent(props: ClusterIconSettingComponentProps) {
  return (
    <div data-testid="my-react-component">
      <span>Test React Component</span>
      <span>
        Cluster
        {props.preferences.clusterName}
      </span>
    </div>
  );
}

const newSettingsReactComponent = getInjectable({
  id: "cluster-icon-settings-react-component",

  instantiate: () => ({
    id: "test-react-component",
    Component: CustomSettingsComponent,
  }),

  injectionToken: clusterIconSettingsComponentInjectionToken,
});

describe("Icon settings", () => {
  let rendered: RenderResult;
  let di: DiContainer;
  let cluster: Cluster;
  let user: UserEvent;

  beforeEach(() => {
    di = getDiForUnitTesting();

    const render = renderFor(di);

    cluster = new Cluster({
      contextName: "some-context",
      id: "some-id",
      kubeConfigPath: "/some/path/to/kubeconfig",
      preferences: {
        clusterName: "some-cluster-name",
      },
    });

    const clusterEntity = new KubernetesCluster({
      metadata: {
        labels: {},
        name: "some-kubernetes-cluster",
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

    rendered = render(<ClusterIconSetting cluster={cluster} entity={clusterEntity} />);

    user = userEvent.setup();
  });

  it("stores a picked image as the icon", async () => {
    const input = rendered.baseElement.querySelector<HTMLInputElement>("input[type=file]");

    await user.upload(input!, new File(["icon"], "icon.png", { type: "image/png" }));

    await waitFor(() => expect(cluster.preferences.icon).toBe("data:image/png;base64,aWNvbg=="));
  });

  describe("given no registrations for cluster settings component injection token", () => {
    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("does not have any external components", async () => {
      expect(rendered.queryByTestId("test-react-component")).not.toBeInTheDocument();
    });
  });

  describe("given registration for cluster settings component injection token", () => {
    beforeEach(() => {
      runInAction(() => {
        di.register(newSettingsReactComponent);
      });
    });

    it("renders external component", async () => {
      expect(rendered.queryByTestId("my-react-component")).toBeInTheDocument();
    });

    it("external component has cluster preferences in props", async () => {
      expect(rendered.getByText(/some-cluster-name/)).toBeInTheDocument();
    });
  });
});
