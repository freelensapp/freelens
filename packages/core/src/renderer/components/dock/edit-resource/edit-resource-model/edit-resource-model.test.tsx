/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import * as yaml from "js-yaml";
import { observable } from "mobx";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditResourceAnnotationName, EditResourceModel } from "./edit-resource-model.injectable";

import type { ShowNotification } from "@freelensapp/notifications";

import type { MockedFunction } from "vitest";

import type { EditingResource, EditResourceTabStore } from "../store";
import type { RequestKubeResource } from "./request-kube-resource.injectable";
import type { RequestPatchKubeResource } from "./request-patch-kube-resource.injectable";

const selfLink = "/api/v1/namespaces/default/pods/test-pod";

describe("edit-resource-model", () => {
  const requestKubeResource = vi.fn() as MockedFunction<RequestKubeResource>;
  const waitForEditingResource = vi.fn(async () => undefined as never);
  const showSuccessNotification = vi.fn() as MockedFunction<ShowNotification>;
  const showErrorNotification = vi.fn() as MockedFunction<ShowNotification>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createModel = (firstDraft: string, draft: string, requestPatchKubeResource?: RequestPatchKubeResource) => {
    const editingResource = observable<EditingResource>({
      resource: selfLink,
      firstDraft,
      draft,
    });
    const requestPatchKubeResourceMock = (requestPatchKubeResource ??
      vi.fn(async () => ({
        callWasSuccessful: true,
        response: {
          kind: "Pod",
          name: "test-pod",
        },
      }))) as MockedFunction<RequestPatchKubeResource>;

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
      editingResource,
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

  it("uses the resize subresource when only pod-level resources change", async () => {
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
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
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
      image: nginx:1.0
  resources:
    requests:
      cpu: 150m
      memory: 128Mi
    limits:
      cpu: 300m
      memory: 256Mi
`;
    const { model, requestPatchKubeResource } = createModel(firstDraft, draft);

    await model.save();

    expect(requestPatchKubeResource).toHaveBeenCalledWith(
      selfLink,
      {
        spec: {
          resources: {
            requests: {
              cpu: "150m",
              memory: "128Mi",
            },
            limits: {
              cpu: "300m",
              memory: "256Mi",
            },
          },
          containers: [
            {
              name: "main",
              resources: undefined,
            },
          ],
          initContainers: undefined,
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

  it("rejects pod edits that mix pod-level resource resizing with other changes", async () => {
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
  const clusterResource = (version = "1", name = "test-pod"): KubeObject =>
    new KubeObject({
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name, namespace: "default", resourceVersion: version, selfLink },
    });

  it("keeps an empty draft and reverts it to the baseline", () => {
    const { model } = createModel("name: original\n", "");

    expect(model.configuration.value.get()).toBe("");
    expect(model.changedLines).toBe(1);
    expect(model.hasChanges).toBe(true);
    model.configuration.error.onChange("invalid YAML");
    model.revert();
    expect(model.configuration.value.get()).toBe("name: original\n");
    expect(model.changedLines).toBe(0);
    expect(model.configuration.error.value.get()).toBe("");
  });

  it("sorts the draft without dropping edits or replacing the baseline", () => {
    const { model } = createModel("z: original\na: first\n", "z: edited\na: first\n");

    model.sortKeys.onChange(true);
    expect(model.configuration.value.get()).toBe("a: first\nz: edited\n");
    expect(model.baseline).toBe("z: original\na: first\n");
  });

  it("captures cluster YAML on initial load while preserving a restored draft", async () => {
    const { model, editingResource } = createModel("", "name: restored\n");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: clusterResource() });

    await model.load();
    expect(yaml.load(model.baseline)).toMatchObject({ metadata: { resourceVersion: "1" } });
    expect(editingResource.baseline).toBe(editingResource.firstDraft);
    expect(model.configuration.value.get()).toBe("name: restored\n");
  });

  it("reloads an unchanged server without a conflict", async () => {
    const { model } = createModel("", "draft: kept\n");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: clusterResource() });
    await model.load();
    await model.reloadBaseline();

    expect(model.hasServerChanges).toBe(false);
    expect(model.configuration.value.get()).toBe("draft: kept\n");
    expect(model.reloading.get()).toBe(false);
  });

  it("compares a newer server version without changing the draft, baseline or Save patch", async () => {
    const { model, editingResource, requestPatchKubeResource } = createModel("", "");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: clusterResource() });
    await model.load();
    const baseline = model.baseline;
    model.configuration.onChange(baseline.replace("name: test-pod", "name: local-edit"));
    const draft = model.configuration.value.get();
    const patchBase = editingResource.firstDraft;
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: clusterResource("2") });
    await model.reloadBaseline();

    expect(model.hasServerChanges).toBe(true);
    expect(model.baseline).toBe(baseline);
    expect(editingResource.firstDraft).toBe(patchBase);
    expect(model.configuration.value.get()).toBe(draft);
    model.compareServer();
    expect(model.diffVisible.get()).toBe(true);
    expect(yaml.load(model.comparisonYaml)).toMatchObject({ metadata: { resourceVersion: "2" } });
    await model.save();
    expect(requestPatchKubeResource.mock.calls[0][1]).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "/metadata/resourceVersion" })]),
    );
    expect(model.baseline).toBe(baseline);
    model.revert();
    expect(model.configuration.value.get()).toBe(baseline);
    expect(model.comparingServer.get()).toBe(false);
  });

  it("retains all local state after a failed reload", async () => {
    const { model } = createModel("name: original\n", "name: edited\n");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: false, error: "Forbidden" });
    await model.reloadBaseline();

    expect(model.baseline).toBe("name: original\n");
    expect(model.configuration.value.get()).toBe("name: edited\n");
    expect(model.reloadError.get()).toContain("Forbidden");
    expect(model.hasServerChanges).toBe(false);
    expect(model.reloading.get()).toBe(false);
  });

  it("handles a deleted resource without discarding edits", async () => {
    const { model } = createModel("baseline", "draft");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: undefined });
    await model.reloadBaseline();
    expect(model.reloadError.get()).toContain("Resource not found");
    expect(model.configuration.value.get()).toBe("draft");
  });

  it("does not start overlapping reload requests", async () => {
    const { model } = createModel("baseline", "draft");
    let resolve!: (value: Awaited<ReturnType<RequestKubeResource>>) => void;
    requestKubeResource.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = model.reloadBaseline();
    await Promise.resolve();
    await model.reloadBaseline();
    expect(requestKubeResource).toHaveBeenCalledTimes(1);
    resolve({ callWasSuccessful: true, response: undefined });
    await first;
    expect(model.reloading.get()).toBe(false);
  });
  it("restores the original draft order when sorting is switched off without further edits", () => {
    const { model } = createModel("z: original\na: first\n", "z: edited\na: first\n");
    model.sortKeys.onChange(true);
    model.sortKeys.onChange(false);
    expect(model.configuration.value.get()).toBe("z: edited\na: first\n");
  });

  it("preserves edits made while sorting is enabled", () => {
    const { model } = createModel("z: original\na: first\n", "z: edited\na: first\n");
    model.sortKeys.onChange(true);
    model.configuration.onChange("a: first\nz: newer\n");
    model.sortKeys.onChange(false);
    expect(yaml.load(model.configuration.value.get())).toEqual({ a: "first", z: "newer" });
  });

  it("accepts a newer baseline without changing the draft or Save patch base", () => {
    const { model, editingResource } = createModel("original", "draft");
    model.serverYaml.set("server");
    model.acceptServerBaseline();
    expect(model.baseline).toBe("server");
    expect(model.configuration.value.get()).toBe("draft");
    expect(editingResource.firstDraft).toBe("original");
    expect(model.hasServerChanges).toBe(false);
    model.revert();
    expect(model.configuration.value.get()).toBe("server");
  });

  it("keeps an explicitly empty restored draft on load", async () => {
    const { model } = createModel("original", "");
    requestKubeResource.mockResolvedValue({ callWasSuccessful: true, response: clusterResource() });
    await model.load();
    expect(model.configuration.value.get()).toBe("");
    expect(model.hasChanges).toBe(true);
  });

  it("releases the reload guard even if the request throws", async () => {
    const { model } = createModel("original", "draft");
    requestKubeResource.mockRejectedValue(new Error("offline"));
    await model.reloadBaseline();
    expect(model.reloading.get()).toBe(false);
    expect(model.reloadError.get()).toContain("Could not reload");
    expect(model.configuration.value.get()).toBe("draft");
  });

  it("follows the API version annotation when reloading", async () => {
    const { model, editingResource } = createModel("original", "draft");
    const annotated = clusterResource();
    annotated.metadata.annotations = { [EditResourceAnnotationName]: "v2" };
    requestKubeResource.mockResolvedValueOnce({ callWasSuccessful: true, response: annotated });
    requestKubeResource.mockResolvedValueOnce({ callWasSuccessful: true, response: clusterResource("2") });
    await model.reloadBaseline();
    expect(requestKubeResource).toHaveBeenNthCalledWith(1, selfLink);
    expect(requestKubeResource).toHaveBeenNthCalledWith(2, selfLink.replace("/v1/", "/v2/"));
    expect(yaml.load(model.serverYaml.get()!)).toMatchObject({ metadata: { resourceVersion: "2" } });
    expect(editingResource.firstDraft).toBe("original");
    expect(model.configuration.value.get()).toBe("draft");
  });

  it("keeps the draft when the annotated API version request fails", async () => {
    const { model } = createModel("original", "draft");
    const annotated = clusterResource();
    annotated.metadata.annotations = { [EditResourceAnnotationName]: "v2" };
    requestKubeResource.mockResolvedValueOnce({ callWasSuccessful: true, response: annotated });
    requestKubeResource.mockResolvedValueOnce({ callWasSuccessful: false, error: "Forbidden" });
    await model.reloadBaseline();
    expect(model.reloadError.get()).toContain("Forbidden");
    expect(model.baseline).toBe("original");
    expect(model.configuration.value.get()).toBe("draft");
  });

  it("reports an invalid annotated self-link in the reload notice", async () => {
    const { model, editingResource } = createModel("original", "draft");
    editingResource.resource = "invalid";
    const annotated = clusterResource();
    annotated.metadata.annotations = { [EditResourceAnnotationName]: "v2" };
    requestKubeResource.mockResolvedValueOnce({ callWasSuccessful: true, response: annotated });
    await model.reloadBaseline();
    expect(model.reloadError.get()).toContain("selfLink is invalid");
    expect(model.configuration.value.get()).toBe("draft");
    expect(model.reloading.get()).toBe(false);
  });

  it("keeps resize routing and the Save-and-close result after adopting a server baseline", async () => {
    const original = `apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  selfLink: ${selfLink}
spec:
  containers:
    - name: main
      resources:
        requests:
          cpu: 100m
`;
    const { model, editingResource, requestPatchKubeResource } = createModel(
      original,
      original.replace("100m", "200m"),
    );
    model.serverYaml.set(original.replace("100m", "300m"));
    model.compareServer();
    model.acceptServerBaseline();
    expect(editingResource.firstDraft).toBe(original);
    expect(await model.save()).toEqual([]);
    expect(requestPatchKubeResource).toHaveBeenCalledWith(
      selfLink,
      expect.objectContaining({
        spec: expect.objectContaining({
          containers: [{ name: "main", resources: { requests: { cpu: "200m" } } }],
        }),
      }),
      { strategy: "strategic", subResource: "resize" },
    );
  });

  it("retains invalid YAML when sorting is toggled", () => {
    const { model } = createModel("original", "name: [\n");
    model.sortKeys.onChange(true);
    model.sortKeys.onChange(false);
    expect(model.configuration.value.get()).toBe("name: [\n");
  });
});
