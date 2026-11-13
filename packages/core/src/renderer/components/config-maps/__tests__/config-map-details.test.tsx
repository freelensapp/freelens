/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ConfigMap } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import directoryForKubeConfigsInjectable from "../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../common/cluster/cluster";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { ConfigMapDetails } from "../config-map-details";

import type { DiRender } from "../../test-utils/renderFor";

function getConfigMap(resourceVersion: string, data: Partial<Record<string, string>>) {
  return new ConfigMap({
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: "test",
      resourceVersion,
      uid: "uid",
      namespace: "default",
      selfLink: "/api/v1/namespaces/default/configmaps/test",
    },
    data,
  });
}

describe("ConfigMapDetails", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );
  });

  it("shows the data of the config map", () => {
    const result = render(<ConfigMapDetails object={getConfigMap("1", { greeting: "hello-v1" })} />);

    expect(result.getByTestId("monaco-editor-for-config-map-data-greeting")).toHaveValue("hello-v1");
  });

  it("shows the data of the newest object when the config map changes in the cluster", () => {
    const result = render(<ConfigMapDetails object={getConfigMap("1", { greeting: "hello-v1" })} />);

    // The store builds a new object for every change that comes from the watch.
    result.rerender(<ConfigMapDetails object={getConfigMap("2", { greeting: "hello-v2", farewell: "bye" })} />);

    expect(result.getByTestId("monaco-editor-for-config-map-data-greeting")).toHaveValue("hello-v2");
    expect(result.getByTestId("monaco-editor-for-config-map-data-farewell")).toHaveValue("bye");
  });
});
