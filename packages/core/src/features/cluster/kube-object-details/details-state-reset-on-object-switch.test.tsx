/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { act } from "@testing-library/react";
import { useState } from "react";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import showDetailsInjectable from "../../../renderer/components/kube-detail-params/show-details.injectable";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";

import type { KubeApi } from "@freelensapp/kube-api";

import type { RenderResult } from "@testing-library/react";

import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../../renderer/components/test-utils/get-extension-fake";

const getKubeObjectStub = (name: string) =>
  KubeObject.create({
    apiVersion: "some-api-version",
    kind: "some-kind",
    metadata: {
      uid: `uid-of-${name}`,
      name,
      resourceVersion: "some-resource-version",
      namespace: "some-namespace",
      selfLink: `/api/some-api-version/namespaces/some-namespace/some-kind/${name}`,
    },
  });

// A detail item with local state, like the "show secret" button of the pod
// environment: the revealed value must not survive a switch to another object.
const DetailsWithLocalState = ({ object }: { object: KubeObject }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div data-testid="details-with-local-state">
      <span data-testid="details-object-name">{object.getName()}</span>
      {revealed ? (
        <span data-testid="revealed-value">revealed value of {object.getName()}</span>
      ) : (
        <button type="button" data-testid="reveal-button" onClick={() => setRevealed(true)}>
          Show
        </button>
      )}
    </div>
  );
};

describe("kube object details local state when switching object", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let showDetails: (path: string) => void;

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    builder.afterWindowStart(({ windowDi }) => {
      const apiManager = windowDi.inject(apiManagerInjectable);
      const api = {
        apiBase: "/api/some-api-version/some-kind",
      } as Partial<KubeApi<KubeObject>> as KubeApi<KubeObject>;
      const store = {
        api,
        loadFromPath: async (path: string) => getKubeObjectStub(path.split("/").at(-1) ?? ""),
        getByPath() {},
      } as Partial<KubeObjectStore<KubeObject>> as KubeObjectStore<KubeObject>;

      apiManager.registerApi(api);
      apiManager.registerStore(store);
    });

    const testExtension: FakeExtensionOptions = {
      id: "test-extension-id",
      name: "test-extension",
      rendererOptions: {
        kubeObjectDetailItems: [
          {
            kind: "some-kind",
            apiVersions: ["some-api-version"],
            components: {
              Details: DetailsWithLocalState,
            },
          },
        ],
      },
    };

    rendered = await builder.render();
    builder.extensions.enable(testExtension);

    showDetails = builder.applicationWindow.only.di.inject(showDetailsInjectable);

    await act(async () => {
      showDetails("/api/some-api-version/namespaces/some-namespace/some-kind/first-object");
    });
  });

  it("shows the details of the first object", () => {
    expect(rendered.getByTestId("details-object-name")).toHaveTextContent("first-object");
  });

  describe("when the value is revealed and the details of another object are opened", () => {
    beforeEach(async () => {
      act(() => {
        rendered.getByTestId("reveal-button").click();
      });

      expect(rendered.getByTestId("revealed-value")).toHaveTextContent("revealed value of first-object");

      await act(async () => {
        showDetails("/api/some-api-version/namespaces/some-namespace/some-kind/second-object");
      });
    });

    it("shows the details of the second object", () => {
      expect(rendered.getByTestId("details-object-name")).toHaveTextContent("second-object");
    });

    it("does not keep the revealed value of the first object", () => {
      expect(rendered.queryByTestId("revealed-value")).not.toBeInTheDocument();
    });

    it("shows the reveal button again", () => {
      expect(rendered.getByTestId("reveal-button")).toBeInTheDocument();
    });
  });
});
