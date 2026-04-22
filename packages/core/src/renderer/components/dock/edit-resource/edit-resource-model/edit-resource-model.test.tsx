/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditResourceModel } from "./edit-resource-model.injectable";

import type { ShowNotification } from "@freelensapp/notifications";

import type { EditingResource, EditResourceTabStore } from "../store";
import type { RequestKubeResource } from "./request-kube-resource.injectable";
import type { RequestPatchKubeResource } from "./request-patch-kube-resource.injectable";

const selfLink = "/api/v1/namespaces/default/pods/test-pod";

describe("edit-resource-model", () => {
  const requestKubeResource = jest.fn() as jest.MockedFunction<RequestKubeResource>;
  const waitForEditingResource = jest.fn(async () => undefined as never);
  const showSuccessNotification = jest.fn() as jest.MockedFunction<ShowNotification>;
  const showErrorNotification = jest.fn() as jest.MockedFunction<ShowNotification>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createModel = (firstDraft: string, draft: string, requestPatchKubeResource?: RequestPatchKubeResource) => {
    const editingResource: EditingResource = {
      resource: selfLink,
      firstDraft,
      draft,
    };
    const requestPatchKubeResourceMock = (requestPatchKubeResource ??
      jest.fn(async () => ({
        callWasSuccessful: true,
        response: {
          kind: "Pod",
          name: "test-pod",
        },
      }))) as jest.MockedFunction<RequestPatchKubeResource>;

    const model = new EditResourceModel({
      requestKubeResource,
      requestPatchKubeResource: requestPatchKubeResourceMock,
      waitForEditingResource,
      showSuccessNotification,
      showErrorNotification,
      store: {
        getData: () => editingResource,
      } as unknown as EditResourceTabStore,
      tabId: "some-tab-id",
    });

    return {
      model,
      requestPatchKubeResource: requestPatchKubeResourceMock,
    };
  };

  it("uses the resize subresource when only pod container resources change", async () => {
    const firstDraft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
  initContainers:
    - name: init
      resources:
        requests:
          cpu: 50m
`;
    const draft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      resources:
        requests:
          cpu: 150m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
  initContainers:
    - name: init
      resources:
        requests:
          cpu: 50m
`;
    const { model, requestPatchKubeResource } = createModel(firstDraft, draft);

    await model.save();

    expect(requestPatchKubeResource).toHaveBeenCalledWith(
      selfLink,
      {
        spec: {
          containers: [
            {
              name: "main",
              resources: {
                requests: {
                  cpu: "150m",
                  memory: "128Mi",
                },
                limits: {
                  cpu: "200m",
                  memory: "256Mi",
                },
              },
            },
          ],
          initContainers: [
            {
              name: "init",
              resources: {
                requests: {
                  cpu: "50m",
                },
              },
            },
          ],
        },
      },
      {
        strategy: "strategic",
        subResource: "resize",
      },
    );
  });

  it("keeps normal json patching for non-resource pod edits", async () => {
    const firstDraft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      image: nginx:1.0
`;
    const draft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      image: nginx:1.1
`;
    const { model, requestPatchKubeResource } = createModel(firstDraft, draft);

    await model.save();

    expect(requestPatchKubeResource).toHaveBeenCalledTimes(1);
    expect(requestPatchKubeResource.mock.calls[0][0]).toBe(selfLink);
    expect(requestPatchKubeResource.mock.calls[0][2]).toEqual({ strategy: "json" });
    expect(requestPatchKubeResource.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: "replace",
          path: "/spec/containers/0/image",
          value: "nginx:1.1",
        }),
      ]),
    );
  });

  it("rejects pod edits that mix resource resizing with other changes", async () => {
    const firstDraft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      image: nginx:1.0
      resources:
        requests:
          cpu: 100m
`;
    const draft = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
  resourceVersion: "1"
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      image: nginx:1.1
      resources:
        requests:
          cpu: 200m
`;
    const { model, requestPatchKubeResource } = createModel(firstDraft, draft);

    await model.save();

    expect(requestPatchKubeResource).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(showErrorNotification.mock.calls[0][0] as React.ReactElement)).toContain(
      "Pod resource updates must be saved separately from other pod changes",
    );
  });
});
