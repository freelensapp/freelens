/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import asyncFn from "@async-fn/jest";
import { httpRouteApiInjectable, referenceGrantApiInjectable } from "@freelensapp/kube-api-specifics";
import { flushPromises } from "@freelensapp/test-utils";
import setupAutoRegistrationInjectable from "../../../renderer/before-frame-starts/runnables/setup-auto-registration.injectable";
import hostedClusterInjectable from "../../../renderer/cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../renderer/stores-apis-can-be-created.injectable";
import { createMockResponseFromString } from "../../../test-utils/mock-responses";
import directoryForKubeConfigsInjectable from "../../app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../cluster/cluster";
import nodeFetchInjectable from "../../fetch/node-fetch.injectable";
import apiManagerInjectable from "../api-manager/manager.injectable";

import type { HTTPRouteApi, ReferenceGrantApi } from "@freelensapp/kube-api";
import type { AsyncFnMock } from "@async-fn/jest";
import type { DiContainer } from "@ogre-tools/injectable";
import type { NodeFetch } from "../../fetch/node-fetch.injectable";
import type { ApiManager } from "../api-manager";

describe("KubeApi - Gateway API version detection", () => {
  let fetchMock: AsyncFnMock<NodeFetch>;
  let apiManager: ApiManager;
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();

    fetchMock = asyncFn();
    di.override(nodeFetchInjectable, () => fetchMock);

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
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

    apiManager = di.inject(apiManagerInjectable);

    const setupAutoRegistration = di.inject(setupAutoRegistrationInjectable);

    setupAutoRegistration.run();
  });

  describe("HTTPRouteApi.get()", () => {
    let httpRouteApi: HTTPRouteApi;
    let getCall: Promise<unknown>;

    beforeEach(async () => {
      httpRouteApi = di.inject(httpRouteApiInjectable);

      getCall = httpRouteApi.get({
        name: "foo",
        namespace: "default",
      });

      await flushPromises();
    });

    it("requests the API group from the initial apiBase", () => {
      expect(fetchMock.mock.lastCall).toMatchObject([
        "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io",
        {
          headers: { "content-type": "application/json" },
          method: "get",
        },
      ]);
    });

    describe("when the version list resolves", () => {
      beforeEach(async () => {
        await fetchMock.resolveSpecific(
          ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io"],
          createMockResponseFromString(
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io",
            JSON.stringify({
              apiVersion: "v1",
              kind: "APIGroup",
              name: "gateway.networking.k8s.io",
              versions: [
                { groupVersion: "gateway.networking.k8s.io/v1", version: "v1" },
                { groupVersion: "gateway.networking.k8s.io/v1beta1", version: "v1beta1" },
              ],
              preferredVersion: {
                groupVersion: "gateway.networking.k8s.io/v1",
                version: "v1",
              },
            }),
          ),
        );
      });

      it("requests resources from the preferred version", () => {
        expect(fetchMock.mock.lastCall).toMatchObject([
          "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1",
          {
            headers: { "content-type": "application/json" },
            method: "get",
          },
        ]);
      });

      describe("when the preferred version does not include httproutes", () => {
        beforeEach(async () => {
          await fetchMock.resolveSpecific(
            ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1"],
            createMockResponseFromString(
              "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1",
              JSON.stringify({
                resources: [{ name: "gateways" }],
              }),
            ),
          );
        });

        it("requests resources from the next available version", () => {
          expect(fetchMock.mock.lastCall).toMatchObject([
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1",
            {
              headers: { "content-type": "application/json" },
              method: "get",
            },
          ]);
        });

        describe("when the next version includes httproutes", () => {
          const resourceUrl =
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1/namespaces/default/httproutes/foo";

          beforeEach(async () => {
            await fetchMock.resolveSpecific(
              ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1"],
              createMockResponseFromString(
                "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1",
                JSON.stringify({
                  resources: [{ name: "httproutes" }],
                }),
              ),
            );
          });

          it("requests the resource using the resolved apiBase", () => {
            expect(fetchMock.mock.lastCall).toMatchObject([
              resourceUrl,
              {
                headers: { "content-type": "application/json" },
                method: "get",
              },
            ]);
          });

          it("registers the api with the resolved apiBase", () => {
            expect(apiManager.getApi("/apis/gateway.networking.k8s.io/v1beta1/httproutes")).toBeDefined();
          });

          describe("when the get request resolves with no data", () => {
            beforeEach(async () => {
              await fetchMock.resolveSpecific(
                [resourceUrl],
                createMockResponseFromString(resourceUrl, JSON.stringify({})),
              );
            });

            it("resolves the get call to null", async () => {
              await expect(getCall).resolves.toBeNull();
            });

            describe("on the second call to HTTPRouteApi.get()", () => {
              let getCall: Promise<unknown>;
              const secondResourceUrl =
                "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1/namespaces/default/httproutes/bar";

              beforeEach(async () => {
                getCall = httpRouteApi.get({
                  name: "bar",
                  namespace: "default",
                });

                await flushPromises();
              });

              it("requests the resource using the cached apiBase", () => {
                expect(fetchMock.mock.lastCall).toMatchObject([
                  secondResourceUrl,
                  {
                    headers: { "content-type": "application/json" },
                    method: "get",
                  },
                ]);
              });

              describe("when the get request resolves with no data", () => {
                beforeEach(async () => {
                  await fetchMock.resolveSpecific(
                    [secondResourceUrl],
                    createMockResponseFromString(secondResourceUrl, JSON.stringify({})),
                  );
                });

                it("resolves the get call to null", async () => {
                  await expect(getCall).resolves.toBeNull();
                });
              });
            });
          });
        });
      });
    });
  });

  describe("ReferenceGrantApi.get()", () => {
    let referenceGrantApi: ReferenceGrantApi;
    let getCall: Promise<unknown>;

    beforeEach(async () => {
      referenceGrantApi = di.inject(referenceGrantApiInjectable);

      getCall = referenceGrantApi.get({
        name: "foo",
        namespace: "default",
      });

      await flushPromises();
    });

    it("requests the API group from the initial apiBase", () => {
      expect(fetchMock.mock.lastCall).toMatchObject([
        "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io",
        {
          headers: { "content-type": "application/json" },
          method: "get",
        },
      ]);
    });

    describe("when the version list resolves", () => {
      beforeEach(async () => {
        await fetchMock.resolveSpecific(
          ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io"],
          createMockResponseFromString(
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io",
            JSON.stringify({
              apiVersion: "v1",
              kind: "APIGroup",
              name: "gateway.networking.k8s.io",
              versions: [
                { groupVersion: "gateway.networking.k8s.io/v1beta1", version: "v1beta1" },
                { groupVersion: "gateway.networking.k8s.io/v1alpha2", version: "v1alpha2" },
              ],
              preferredVersion: {
                groupVersion: "gateway.networking.k8s.io/v1beta1",
                version: "v1beta1",
              },
            }),
          ),
        );
      });

      it("requests resources from the preferred version", () => {
        expect(fetchMock.mock.lastCall).toMatchObject([
          "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1",
          {
            headers: { "content-type": "application/json" },
            method: "get",
          },
        ]);
      });

      describe("when the preferred version does not include referencegrants", () => {
        beforeEach(async () => {
          await fetchMock.resolveSpecific(
            ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1"],
            createMockResponseFromString(
              "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1beta1",
              JSON.stringify({
                resources: [{ name: "httproutes" }],
              }),
            ),
          );
        });

        it("requests resources from the next available version", () => {
          expect(fetchMock.mock.lastCall).toMatchObject([
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1alpha2",
            {
              headers: { "content-type": "application/json" },
              method: "get",
            },
          ]);
        });

        describe("when the next version includes referencegrants", () => {
          const resourceUrl =
            "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/referencegrants/foo";

          beforeEach(async () => {
            await fetchMock.resolveSpecific(
              ["https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1alpha2"],
              createMockResponseFromString(
                "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1alpha2",
                JSON.stringify({
                  resources: [{ name: "referencegrants" }],
                }),
              ),
            );
          });

          it("requests the resource using the resolved apiBase", () => {
            expect(fetchMock.mock.lastCall).toMatchObject([
              resourceUrl,
              {
                headers: { "content-type": "application/json" },
                method: "get",
              },
            ]);
          });

          it("registers the api with the resolved apiBase", () => {
            expect(apiManager.getApi("/apis/gateway.networking.k8s.io/v1alpha2/referencegrants")).toBeDefined();
          });

          describe("when the get request resolves with no data", () => {
            beforeEach(async () => {
              await fetchMock.resolveSpecific(
                [resourceUrl],
                createMockResponseFromString(resourceUrl, JSON.stringify({})),
              );
            });

            it("resolves the get call to null", async () => {
              await expect(getCall).resolves.toBeNull();
            });

            describe("on the second call to ReferenceGrantApi.get()", () => {
              let getCall: Promise<unknown>;
              const secondResourceUrl =
                "https://127.0.0.1:12345/api-kube/apis/gateway.networking.k8s.io/v1alpha2/namespaces/default/referencegrants/bar";

              beforeEach(async () => {
                getCall = referenceGrantApi.get({
                  name: "bar",
                  namespace: "default",
                });

                await flushPromises();
              });

              it("requests the resource using the cached apiBase", () => {
                expect(fetchMock.mock.lastCall).toMatchObject([
                  secondResourceUrl,
                  {
                    headers: { "content-type": "application/json" },
                    method: "get",
                  },
                ]);
              });

              describe("when the get request resolves with no data", () => {
                beforeEach(async () => {
                  await fetchMock.resolveSpecific(
                    [secondResourceUrl],
                    createMockResponseFromString(secondResourceUrl, JSON.stringify({})),
                  );
                });

                it("resolves the get call to null", async () => {
                  await expect(getCall).resolves.toBeNull();
                });
              });
            });
          });
        });
      });
    });
  });
});
