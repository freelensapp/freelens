/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import navigateToCustomResourcesInjectable from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import { CustomResourceDefinition } from "../../extensions/common-api/k8s-api";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";

import type { RenderResult } from "@testing-library/react";

import type { NavigateToCustomResources } from "../../common/front-end-routing/routes/cluster/custom-resources/navigate-to-custom-resources.injectable";
import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { UserPreferencesState } from "../user-preferences/common/state.injectable";

describe("cluster - custom resources in sidebar", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;
  let customResourceDefinition: CustomResourceDefinition;
  let userPreferencesState: UserPreferencesState;
  let navigateToCustomResources: NavigateToCustomResources;

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    builder.afterWindowStart(({ windowDi }) => {
      customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);
      navigateToCustomResources = windowDi.inject(navigateToCustomResourcesInjectable);
      userPreferencesState = windowDi.inject(userPreferencesStateInjectable);
      userPreferencesState.groupCustomResourcesByDomain = true;
      customResourceDefinition = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "some-crd",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/some-crd",
          uid: "some-uid",
          resourceVersion: "1",
        },
        spec: {
          group: "some.group.com",
          scope: "Cluster",
          names: {
            kind: "SomeResource",
            plural: "some-resources",
            singular: "some-resource",
          },
          versions: [
            {
              storage: true,
              name: "v1",
              served: true,
              additionalPrinterColumns: [
                {
                  name: "Some Column",
                  type: "string",
                  description: "Some description",
                  jsonPath: ".spec.someColumn",
                },
              ],
            },
          ],
        },
      });
    });

    result = await builder.render();
  });

  it("renders", () => {
    expect(result.container).toMatchSnapshot();
  });

  it("shows the sidebar", async () => {
    await waitFor(() => expect(result.getByTestId("cluster-sidebar")).toBeInTheDocument(), { timeout: 300 });
  });

  it("does not show Custom Resources section", async () => {
    await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resources")).not.toBeInTheDocument(), {
      timeout: 300,
    });
  });

  describe("when custom resource exists", () => {
    beforeEach(() => {
      customResourceDefinitionStore.items.replace([customResourceDefinition]);
    });

    it("renders", () => {
      expect(result.container).toMatchSnapshot();
    });

    it("still does not show Custom Resources sidebar", async () => {
      await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resources")).not.toBeInTheDocument(), {
        timeout: 300,
      });
    });

    describe("when specific custom resource is an allowed resource", () => {
      beforeEach(() => {
        builder.allowKubeResource({
          apiName: "some-resources",
          group: "some.group.com",
        });
      });

      it("renders", () => {
        expect(result.container).toMatchSnapshot();
      });

      it("shows Custom Resources sidebar", async () => {
        await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(), {
          timeout: 300,
        });
      });

      it("shows Custom Resources sidebar as expandable", async () => {
        await waitFor(
          () => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      it("groups related API groups by reversed DNS labels", async () => {
        const createDefinition = (group: string, plural: string, kind: string) =>
          new CustomResourceDefinition({
            apiVersion: "apiextensions.k8s.io/v1",
            kind: "CustomResourceDefinition",
            metadata: {
              name: `${plural}.${group}`,
              selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
              uid: `${plural}-uid`,
              resourceVersion: "1",
            },
            spec: {
              group,
              scope: "Cluster",
              names: { kind, plural, singular: plural },
              versions: [{ storage: true, name: "v1", served: true }],
            },
          });

        customResourceDefinitionStore.items.replace([
          createDefinition("sample.io", "samples", "Sample"),
          createDefinition("gcp.sample.io", "gcps", "Gcp"),
        ]);
        builder.allowKubeResource({ apiName: "samples", group: "sample.io" });
        builder.allowKubeResource({ apiName: "gcps", group: "gcp.sample.io" });

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io").click(),
          {
            timeout: 300,
          },
        );

        expect(result.queryByTestId("sidebar-item-custom-resource-group-sample.io")).not.toBeInTheDocument();
        expect(result.getByTestId("sidebar-item-custom-resource-group-folder-io.sample")).toBeInTheDocument();

        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io.sample").click(),
          { timeout: 300 },
        );

        expect(result.getByTestId("sidebar-item-custom-resource-group-sample.io/samples")).toHaveAttribute(
          "data-parent-id-test",
          "sidebar-item-custom-resource-group-folder-io.sample",
        );
        expect(result.getByTestId("sidebar-item-custom-resource-group-gcp.sample.io")).toBeInTheDocument();
      });

      it("orders expandable entries alphabetically before CRDs", async () => {
        const definitions = [
          ["resources.zeta.io", "zetaresources", "ZetaResource"],
          ["resources.alpha.io", "alpharesources", "AlphaResource"],
          ["charlie.io", "charlieresources", "CharlieResource"],
          ["bravo.io", "bravoresources", "BravoResource"],
        ] as const;
        const createDefinition = ([group, plural, kind]: (typeof definitions)[number]) =>
          new CustomResourceDefinition({
            apiVersion: "apiextensions.k8s.io/v1",
            kind: "CustomResourceDefinition",
            metadata: {
              name: `${plural}.${group}`,
              selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
              uid: `${plural}-uid`,
              resourceVersion: "1",
            },
            spec: {
              group,
              scope: "Cluster",
              names: { kind, plural, singular: plural },
              versions: [{ storage: true, name: "v1", served: true }],
            },
          });

        customResourceDefinitionStore.items.replace([createDefinition(definitions[0])]);

        for (const [group, plural] of definitions) {
          builder.allowKubeResource({ group, apiName: plural });
        }

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io").click(),
          { timeout: 300 },
        );

        customResourceDefinitionStore.items.replace(definitions.map(createDefinition));

        const getSiblingIds = () =>
          Array.from(
            result.container.querySelectorAll<HTMLElement>(
              '[data-parent-id-test="sidebar-item-custom-resource-group-folder-io"]',
            ),
          ).map((item) => item.getAttribute("data-testid"));

        await waitFor(
          () =>
            expect(getSiblingIds()).toEqual([
              "sidebar-item-custom-resource-group-folder-io.alpha",
              "sidebar-item-custom-resource-group-bravo.io",
              "sidebar-item-custom-resource-group-charlie.io",
              "sidebar-item-custom-resource-group-folder-io.zeta",
            ]),
          { timeout: 300 },
        );
      });

      it("sorts nested folders alphabetically at each level", async () => {
        const folderNames = ["grafana", "m", "mongodbatlas", "o", "apiextensions", "ops", "pkg", "protection"];
        const definitions = folderNames.map(
          (folder) => [`resources.${folder}.crossplane.io`, `${folder}resources`, `${folder}Resource`] as const,
        );

        customResourceDefinitionStore.items.replace(
          definitions.map(
            ([group, plural, kind]) =>
              new CustomResourceDefinition({
                apiVersion: "apiextensions.k8s.io/v1",
                kind: "CustomResourceDefinition",
                metadata: {
                  name: `${plural}.${group}`,
                  selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
                  uid: `${plural}-uid`,
                  resourceVersion: "1",
                },
                spec: {
                  group,
                  scope: "Cluster",
                  names: { kind, plural, singular: plural },
                  versions: [{ storage: true, name: "v1", served: true }],
                },
              }),
          ),
        );

        for (const [group, plural] of definitions) {
          builder.allowKubeResource({ group, apiName: plural });
        }

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io").click(),
          { timeout: 300 },
        );
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io.crossplane").click(),
          { timeout: 300 },
        );

        const nestedFolderIds = Array.from(
          result.container.querySelectorAll<HTMLElement>(
            '[data-parent-id-test="sidebar-item-custom-resource-group-folder-io.crossplane"]',
          ),
        ).map((item) => item.getAttribute("data-testid"));

        expect(nestedFolderIds).toEqual(
          ["apiextensions", "grafana", "m", "mongodbatlas", "o", "ops", "pkg", "protection"].map(
            (folder) => `sidebar-item-custom-resource-group-folder-io.crossplane.${folder}`,
          ),
        );
      });

      it("merges a group into its matching domain folder", async () => {
        const definitions = [
          ["cert-manager.io", "certificaterequests", "CertificateRequest"],
          ["cert-manager.io", "certificates", "Certificate"],
          ["cert-manager.io", "clusterissuers", "ClusterIssuer"],
          ["cert-manager.io", "issuers", "Issuer"],
          ["acme.cert-manager.io", "challenges", "Challenge"],
          ["acme.cert-manager.io", "orders", "Order"],
        ] as const;

        customResourceDefinitionStore.items.replace(
          definitions.map(
            ([group, plural, kind]) =>
              new CustomResourceDefinition({
                apiVersion: "apiextensions.k8s.io/v1",
                kind: "CustomResourceDefinition",
                metadata: {
                  name: `${plural}.${group}`,
                  selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
                  uid: `${plural}-uid`,
                  resourceVersion: "1",
                },
                spec: {
                  group,
                  scope: "Cluster",
                  names: { kind, plural, singular: plural },
                  versions: [{ storage: true, name: "v1", served: true }],
                },
              }),
          ),
        );

        for (const [group, plural] of definitions) {
          builder.allowKubeResource({ group, apiName: plural });
        }

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io").click(),
          {
            timeout: 300,
          },
        );

        const certManagerFolder = result.getByTestId("sidebar-item-custom-resource-group-folder-io.cert-manager");

        expect(certManagerFolder).toBeInTheDocument();
        expect(
          result
            .getByTestId("link-for-sidebar-item-custom-resource-group-folder-io.cert-manager")
            .querySelector('[data-icon-name="folder"]'),
        ).toBeInTheDocument();
        expect(result.queryByTestId("sidebar-item-custom-resource-group-cert-manager.io")).not.toBeInTheDocument();

        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io.cert-manager").click(),
          { timeout: 300 },
        );

        expect(result.getByTestId("sidebar-item-custom-resource-group-acme.cert-manager.io")).toBeInTheDocument();
        expect(
          result
            .getByTestId("link-for-sidebar-item-custom-resource-group-acme.cert-manager.io")
            .querySelector('[data-icon-name="folder"]'),
        ).toBeInTheDocument();
        expect(result.getByTestId("sidebar-item-custom-resource-group-acme.cert-manager.io")).toHaveAttribute(
          "data-parent-id-test",
          "sidebar-item-custom-resource-group-folder-io.cert-manager",
        );
        expect(
          result.getByTestId("sidebar-item-custom-resource-group-cert-manager.io/certificaterequests"),
        ).toHaveAttribute("data-parent-id-test", "sidebar-item-custom-resource-group-folder-io.cert-manager");
        expect(
          result
            .getByTestId("link-for-sidebar-item-custom-resource-group-cert-manager.io/certificaterequests")
            .querySelector('[data-icon-name="extension"]'),
        ).toBeInTheDocument();

        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-acme.cert-manager.io").click(),
          { timeout: 300 },
        );
        expect(
          result.getByTestId("sidebar-item-custom-resource-group-acme.cert-manager.io/challenges"),
        ).toBeInTheDocument();
      });

      it("switches between flat and domain-grouped views", async () => {
        userPreferencesState.groupCustomResourcesByDomain = false;

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });

        expect(result.getByTestId("sidebar-item-custom-resource-group-some.group.com")).toHaveAttribute(
          "data-parent-id-test",
          "sidebar-item-custom-resources",
        );
        expect(result.queryByTestId("sidebar-item-custom-resource-group-folder-com")).not.toBeInTheDocument();

        userPreferencesState.groupCustomResourcesByDomain = true;

        await waitFor(
          () => expect(result.getByTestId("sidebar-item-custom-resource-group-folder-com")).toBeInTheDocument(),
          { timeout: 300 },
        );
        expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument();

        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-com").click(),
          { timeout: 300 },
        );
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-com.group").click(),
          { timeout: 300 },
        );
        expect(result.getByTestId("sidebar-item-custom-resource-group-some.group.com")).toHaveAttribute(
          "data-parent-id-test",
          "sidebar-item-custom-resource-group-folder-com.group",
        );
      });

      it("shows cert-manager CRDs in their domain folders", async () => {
        const definitions = [
          ["cert-manager.io", "certificaterequests", "CertificateRequest"],
          ["cert-manager.io", "certificates", "Certificate"],
          ["cert-manager.io", "clusterissuers", "ClusterIssuer"],
          ["cert-manager.io", "issuers", "Issuer"],
          ["acme.cert-manager.io", "challenges", "Challenge"],
          ["acme.cert-manager.io", "orders", "Order"],
        ] as const;

        customResourceDefinitionStore.items.replace(
          definitions.map(
            ([group, plural, kind]) =>
              new CustomResourceDefinition({
                apiVersion: "apiextensions.k8s.io/v1",
                kind: "CustomResourceDefinition",
                metadata: {
                  name: `${plural}.${group}`,
                  selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
                  uid: `${plural}-uid`,
                  resourceVersion: "1",
                },
                spec: {
                  group,
                  scope: "Cluster",
                  names: { kind, plural, singular: plural },
                  versions: [{ storage: true, name: "v1", served: true }],
                },
              }),
          ),
        );

        for (const [group, plural] of definitions) {
          builder.allowKubeResource({ group, apiName: plural });
        }

        await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
          timeout: 300,
        });
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io").click(),
          {
            timeout: 300,
          },
        );

        expect(result.queryByTestId("sidebar-item-custom-resource-group-cert-manager.io")).not.toBeInTheDocument();
        expect(result.getByTestId("sidebar-item-custom-resource-group-folder-io.cert-manager")).toBeInTheDocument();

        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-io.cert-manager").click(),
          { timeout: 300 },
        );

        expect(result.getByTestId("sidebar-item-custom-resource-group-acme.cert-manager.io")).toBeInTheDocument();
        await waitFor(
          () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-acme.cert-manager.io").click(),
          { timeout: 300 },
        );
        expect(
          result.getByTestId("sidebar-item-custom-resource-group-acme.cert-manager.io/challenges"),
        ).toBeInTheDocument();

        expect(
          result.getByTestId("sidebar-item-custom-resource-group-cert-manager.io/certificaterequests"),
        ).toHaveAttribute("data-parent-id-test", "sidebar-item-custom-resource-group-folder-io.cert-manager");
      });

      it("expands the tree down to a custom resource that is opened", async () => {
        customResourceDefinitionStore.items.replace(
          [
            ["sample.io", "samples", "Sample"],
            ["gcp.sample.io", "gcps", "Gcp"],
          ].map(
            ([group, plural, kind]) =>
              new CustomResourceDefinition({
                apiVersion: "apiextensions.k8s.io/v1",
                kind: "CustomResourceDefinition",
                metadata: {
                  name: `${plural}.${group}`,
                  selfLink: `/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${plural}.${group}`,
                  uid: `${plural}-uid`,
                  resourceVersion: "1",
                },
                spec: {
                  group,
                  scope: "Cluster",
                  names: { kind, plural, singular: plural },
                  versions: [{ storage: true, name: "v1", served: true }],
                },
              }),
          ),
        );
        builder.allowKubeResource({ apiName: "samples", group: "sample.io" });
        builder.allowKubeResource({ apiName: "gcps", group: "gcp.sample.io" });

        act(() => navigateToCustomResources({ group: "gcp.sample.io", name: "gcps" }));

        await waitFor(
          () =>
            expect(result.getByTestId("sidebar-item-custom-resource-group-gcp.sample.io/gcps")).toHaveAttribute(
              "data-is-active-test",
              "true",
            ),
          { timeout: 300 },
        );

        act(() => result.getByTestId("collapse-all-icon-for-sidebar-item-custom-resources").click());

        await waitFor(
          () =>
            expect(
              result.queryByTestId("sidebar-item-custom-resource-group-gcp.sample.io/gcps"),
            ).not.toBeInTheDocument(),
          { timeout: 300 },
        );
        expect(result.getByTestId("sidebar-item-custom-resource-group-folder-io")).toBeInTheDocument();
      });

      it("does not show SomeResources sidebar", async () => {
        await waitFor(
          () =>
            expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      it("does not show Custom Resources Definitions sidebar", async () => {
        await waitFor(
          () => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      describe("when custom resources sidebar item is expanded", () => {
        beforeEach(async () => {
          await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(), {
            timeout: 300,
          });
        });

        it("renders", () => {
          expect(result.container).toMatchSnapshot();
        });

        it("shows Custom Resources sidebar", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(), {
            timeout: 300,
          });
        });

        it("shows Custom Resources sidebar as expandable", async () => {
          await waitFor(
            () => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });

        it("shows the com folder", async () => {
          await waitFor(
            () => expect(result.getByTestId("sidebar-item-custom-resource-group-folder-com")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });

        it("does not show Custom Resources Definitions sidebar", async () => {
          await waitFor(
            () => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
            { timeout: 300 },
          );
        });

        describe("when the com folder is expanded", () => {
          beforeEach(async () => {
            await waitFor(
              () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-com").click(),
              { timeout: 300 },
            );
          });

          it("shows the group folder", async () => {
            await waitFor(
              () =>
                expect(result.getByTestId("sidebar-item-custom-resource-group-folder-com.group")).toBeInTheDocument(),
              { timeout: 300 },
            );
          });

          describe("when the group folder is expanded", () => {
            beforeEach(async () => {
              await waitFor(
                () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-folder-com.group").click(),
                { timeout: 300 },
              );
            });

            it("shows the some.group.com group", async () => {
              await waitFor(
                () =>
                  expect(result.getByTestId("sidebar-item-custom-resource-group-some.group.com")).toBeInTheDocument(),
                { timeout: 300 },
              );
            });

            it("formats the some.group.com group title correctly", async () => {
              await waitFor(
                () =>
                  expect(
                    result
                      .getByTestId("link-for-sidebar-item-custom-resource-group-some.group.com")
                      .querySelector(":scope > span"),
                  ).toHaveTextContent("some"),
                { timeout: 300 },
              );
            });

            describe("when the some.group.com group is expanded", () => {
              beforeEach(async () => {
                await waitFor(
                  () => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-some.group.com").click(),
                  { timeout: 300 },
                );
              });

              it("renders", () => {
                expect(result.container).toMatchSnapshot();
              });

              it("shows the some-resources sidebar item", async () => {
                await waitFor(
                  () =>
                    expect(
                      result.getByTestId("sidebar-item-custom-resource-group-some.group.com/some-resources"),
                    ).toBeInTheDocument(),
                  { timeout: 300 },
                );
              });

              it("formats the some-resources sidebar item title correctly", async () => {
                await waitFor(
                  () =>
                    expect(
                      result.getByTestId("sidebar-item-custom-resource-group-some.group.com/some-resources"),
                    ).toHaveTextContent("Some Resource"),
                  { timeout: 300 },
                );
              });
            });
          });
        });
      });
    });

    describe("when custom resource definitions are an allowed resource", () => {
      beforeEach(() => {
        builder.allowKubeResource({
          apiName: "customresourcedefinitions",
          group: "apiextensions.k8s.io",
        });
      });

      it("renders", () => {
        expect(result.container).toMatchSnapshot();
      });

      it("shows Custom Resources sidebar", async () => {
        await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(), {
          timeout: 300,
        });
      });

      it("shows Custom Resources sidebar as expandable", async () => {
        await waitFor(
          () => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      it("does not show SomeResources sidebar", async () => {
        await waitFor(
          () =>
            expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      it("does not show Custom Resources Definitions sidebar", async () => {
        await waitFor(
          () => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
          { timeout: 300 },
        );
      });

      describe("when custom resources sidebar item is expanded", () => {
        beforeEach(() => {
          result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click();
        });

        it("renders", () => {
          expect(result.container).toMatchSnapshot();
        });

        it("shows Custom Resources sidebar", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(), {
            timeout: 300,
          });
        });

        it("shows Custom Resources sidebar as expandable", async () => {
          await waitFor(
            () => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });

        it("does not show SomeResources sidebar", async () => {
          await waitFor(
            () =>
              expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
            { timeout: 300 },
          );
        });

        it("shows Custom Resources Definitions sidebar", async () => {
          await waitFor(
            () => expect(result.getByTestId("sidebar-item-custom-resource-definitions")).toBeInTheDocument(),
            { timeout: 300 },
          );
        });
      });
    });
  });

  describe("when custom resource definitions are an allowed resource", () => {
    beforeEach(() => {
      builder.allowKubeResource({
        apiName: "customresourcedefinitions",
        group: "apiextensions.k8s.io",
      });
    });

    it("renders", () => {
      expect(result.container).toMatchSnapshot();
    });

    it("shows Custom Resources sidebar", async () => {
      await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(), {
        timeout: 300,
      });
    });

    it("shows Custom Resources sidebar as expandable", async () => {
      await waitFor(
        () => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
        { timeout: 300 },
      );
    });

    it("does not show Custom Resources Definitions sidebar", async () => {
      await waitFor(
        () => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
        { timeout: 300 },
      );
    });
  });
});
