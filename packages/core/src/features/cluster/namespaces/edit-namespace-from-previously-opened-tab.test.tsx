/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { Namespace } from "@freelensapp/kube-object";
import type { RenderResult } from "@testing-library/react";
import { act } from "@testing-library/react";
import directoryForLensLocalStorageInjectable from "../../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import writeJsonFileInjectable from "../../../common/fs/write-json-file.injectable";
import { TabKind } from "../../../renderer/components/dock/dock/store";
import type { RequestKubeResource } from "../../../renderer/components/dock/edit-resource/edit-resource-model/request-kube-resource.injectable";
import requestKubeResourceInjectable from "../../../renderer/components/dock/edit-resource/edit-resource-model/request-kube-resource.injectable";
import type { ApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../../renderer/components/test-utils/get-application-builder";

describe("cluster/namespaces - edit namespaces from previously opened tab", () => {
  let builder: ApplicationBuilder;
  let requestKubeResourceMock: AsyncFnMock<RequestKubeResource>;

  beforeEach(() => {
    builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();

    requestKubeResourceMock = asyncFn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");

      windowDi.override(requestKubeResourceInjectable, () => requestKubeResourceMock);
    });

    builder.afterWindowStart(() => {
      builder.allowKubeResource({
        apiName: "namespaces",
        group: "",
      });
    });
  });

  describe("given tab was previously opened, when application is started", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      builder.beforeWindowStart(async ({ windowDi }) => {
        const writeJsonFile = windowDi.inject(writeJsonFileInjectable);

        await writeJsonFile("/some-directory-for-lens-local-storage/some-cluster-id.json", {
          dock: {
            height: 300,
            tabs: [
              {
                id: "some-first-tab-id",
                kind: TabKind.EDIT_RESOURCE,
                title: "Namespace: some-namespace",
                pinned: false,
              },
            ],

            isOpen: true,
          },

          edit_resource_store: {
            "some-first-tab-id": {
              resource: "/apis/some-api-version/namespaces/some-uid",
              draft: "some-saved-configuration",
            },
          },
        });
      });

      rendered = await builder.render();
    });

    it("renders", () => {
      expect(rendered.baseElement).toMatchSnapshot();
    });

    it("shows dock tab for editing namespace", () => {
      expect(rendered.getByTestId("dock-tab-for-some-first-tab-id")).toBeInTheDocument();
    });

    it("shows spinner in the dock tab", () => {
      expect(rendered.getByTestId("edit-resource-tab-spinner")).toBeInTheDocument();
    });

    it("calls for namespace", () => {
      expect(requestKubeResourceMock).toHaveBeenCalledWith("/apis/some-api-version/namespaces/some-uid");
    });

    describe("when call for namespace resolves with namespace", () => {
      let someNamespace: Namespace;

      beforeEach(async () => {
        someNamespace = new Namespace({
          apiVersion: "some-api-version",
          kind: "Namespace",

          metadata: {
            uid: "some-uid",
            name: "some-name",
            resourceVersion: "some-resource-version",
            selfLink: "/apis/some-api-version/namespaces/some-uid",
            somePropertyToBeRemoved: "some-value",
            somePropertyToBeChanged: "some-old-value",
          },
        });

        // TODO: Figure out why act is needed here. In CI it works without it.
        await act(async () => {
          await requestKubeResourceMock.resolve({
            callWasSuccessful: true,
            response: someNamespace,
          });
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("has the saved configuration in editor", () => {
        const input = rendered.getByTestId("monaco-editor-for-some-first-tab-id") as HTMLTextAreaElement;

        expect(input.value).toBe("some-saved-configuration");
      });
    });
  });
});
