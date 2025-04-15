/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DeploymentApi } from "@freelensapp/kube-api";
import { deploymentApiInjectable } from "@freelensapp/kube-api-specifics";
import { Deployment } from "@freelensapp/kube-object";
import { fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import type { DiRender } from "../../test-utils/renderFor";
import { renderFor } from "../../test-utils/renderFor";
import { DeploymentScaleDialog } from "./dialog";
import type { OpenDeploymentScaleDialog } from "./open.injectable";
import openDeploymentScaleDialogInjectable from "./open.injectable";

const dummyDeployment = new Deployment({
  apiVersion: "v1",
  kind: "dummy",
  metadata: {
    uid: "dummy",
    name: "dummy",
    creationTimestamp: "dummy",
    resourceVersion: "dummy",
    namespace: "default",
    selfLink: "/apis/apps/v1/deployments/default/dummy",
  },
  spec: {
    replicas: 1,
    selector: { matchLabels: { dummy: "label" } },
    template: {
      metadata: {
        labels: { dummy: "label" },
      },
      spec: {
        containers: [
          {
            name: "dummy",
            image: "dummy",
            resources: {
              requests: {
                cpu: "1",
                memory: "10Mi",
              },
            },
            terminationMessagePath: "dummy",
            terminationMessagePolicy: "File",
            imagePullPolicy: "Always",
          },
        ],
        restartPolicy: "dummy",
        terminationGracePeriodSeconds: 10,
        dnsPolicy: "dummy",
        serviceAccountName: "dummy",
        serviceAccount: "dummy",
        securityContext: {},
        schedulerName: "dummy",
      },
    },
    strategy: {
      type: "dummy",
      rollingUpdate: {
        maxUnavailable: 1,
        maxSurge: 10,
      },
    },
  },
  status: {
    observedGeneration: 1,
    replicas: 1,
    updatedReplicas: 1,
    readyReplicas: 1,
    conditions: [
      {
        type: "dummy",
        status: "True",
        lastTransitionTime: "dummy",
        reason: "dummy",
        message: "dummy",
      },
    ],
  },
});

describe("<DeploymentScaleDialog />", () => {
  let deploymentApi: DeploymentApi;
  let openDeploymentScaleDialog: OpenDeploymentScaleDialog;
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    deploymentApi = di.inject(deploymentApiInjectable);
    openDeploymentScaleDialog = di.inject(openDeploymentScaleDialogInjectable);
    render = renderFor(di);
  });

  it("renders w/o errors", () => {
    const { container } = render(<DeploymentScaleDialog />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("inits with a dummy deployment with mocked current/desired scale", async () => {
    // mock deploymentApi.getReplicas() which will be called
    // when <DeploymentScaleDialog /> rendered.
    const initReplicas = 3;

    deploymentApi.getReplicas = jest.fn().mockImplementationOnce(async () => Promise.resolve(initReplicas));
    const { findByTestId } = render(<DeploymentScaleDialog />);

    openDeploymentScaleDialog(dummyDeployment);
    // we need to wait for the DeploymentScaleDialog to show up
    // because there is an <Animate /> in <Dialog /> which renders null at start.
    await waitFor(async () => {
      const [currentScale, desiredScale] = await Promise.all([
        findByTestId("current-scale"),
        findByTestId("desired-scale"),
      ]);

      expect(currentScale).toHaveTextContent(`${initReplicas}`);
      expect(desiredScale).toHaveTextContent(`${initReplicas}`);
    });
  });

  it("changes the desired scale when clicking the icon buttons +/-", async () => {
    const initReplicas = 1;

    deploymentApi.getReplicas = jest.fn().mockImplementationOnce(async () => Promise.resolve(initReplicas));
    const component = render(<DeploymentScaleDialog />);

    openDeploymentScaleDialog(dummyDeployment);
    await waitFor(async () => {
      expect(await component.findByTestId("desired-scale")).toHaveTextContent(`${initReplicas}`);
      expect(await component.findByTestId("current-scale")).toHaveTextContent(`${initReplicas}`);
      expect(component.baseElement.querySelector("input")?.value).toBe(`${initReplicas}`);
    });
    const up = await component.findByTestId("desired-replicas-up");
    const down = await component.findByTestId("desired-replicas-down");

    fireEvent.click(up);
    expect(await component.findByTestId("desired-scale")).toHaveTextContent(`${initReplicas + 1}`);
    expect(await component.findByTestId("current-scale")).toHaveTextContent(`${initReplicas}`);
    expect(component.baseElement.querySelector("input")?.value).toBe(`${initReplicas + 1}`);

    fireEvent.click(down);
    expect(await component.findByTestId("desired-scale")).toHaveTextContent(`${initReplicas}`);
    expect(await component.findByTestId("current-scale")).toHaveTextContent(`${initReplicas}`);
    expect(component.baseElement.querySelector("input")?.value).toBe(`${initReplicas}`);

    // edge case, desiredScale must = 0
    let times = 10;

    for (let i = 0; i < times; i++) {
      fireEvent.click(down);
    }
    expect(await component.findByTestId("desired-scale")).toHaveTextContent("0");
    expect(component.baseElement.querySelector("input")?.value).toBe("0");

    // edge case, desiredScale must = 100 scaleMax (100)
    times = 120;

    for (let i = 0; i < times; i++) {
      fireEvent.click(up);
    }
    expect(await component.findByTestId("desired-scale")).toHaveTextContent("100");
    expect(component.baseElement.querySelector("input")?.value).toBe("100");
    expect(await component.findByTestId("warning")).toHaveTextContent(
      "High number of replicas may cause cluster performance issues",
    );
  });
});
