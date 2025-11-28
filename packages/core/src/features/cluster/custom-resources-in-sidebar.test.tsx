/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "../../extensions/common-api/k8s-api";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { RenderResult } from "@testing-library/react";

import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { waitFor } from "@testing-library/react";

describe("cluster - custom resources in sidebar", () => {
  let builder: ApplicationBuilder;
  let result: RenderResult;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;
  let customResourceDefinition: CustomResourceDefinition;

  beforeEach(async () => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();

    builder.afterWindowStart(({ windowDi }) => {
      customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);
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
    await waitFor(() => expect(result.getByTestId("cluster-sidebar")).toBeInTheDocument(),
      { timeout: 300 });
  });

  it("does not show Custom Resources section", async () => {
    await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resources")).not.toBeInTheDocument(),
      { timeout: 300 });
  });

  describe("when custom resource exists", () => {
    beforeEach(() => {
      customResourceDefinitionStore.items.replace([customResourceDefinition]);
    });

    it("renders", () => {
      expect(result.container).toMatchSnapshot();
    });

    it("still does not show Custom Resources sidebar", async () => {
      await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resources")).not.toBeInTheDocument(),
        { timeout: 300 });
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
        await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 });
      });

      it("shows Custom Resources sidebar as expandable", async () => {
        await waitFor(() => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 });
      });

      it("does not show SomeResources sidebar", async () => {
        await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
          { timeout: 300 });
      });

      it("does not show Custom Resources Definitions sidebar", async () => {
        await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
          { timeout: 300 });
      });

      describe("when custom resources sidebar item is expanded", () => {
        beforeEach(async () => {
          await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click(),
            { timeout: 300 });
        });

        it("renders", () => {
          expect(result.container).toMatchSnapshot();
        });

        it("shows Custom Resources sidebar", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 });
        });

        it("shows Custom Resources sidebar as expandable", async () => {
          await waitFor(() => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 });
        });

        it("shows some.group.com group sidebar item", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resource-group-some.group.com")).toBeInTheDocument(),
            { timeout: 300 });
        });

        it("does not show Custom Resources Definitions sidebar", async () => {
          await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
            { timeout: 300 });
        });

        describe("when custom resources group sidebar item is expanded", () => {
          beforeEach(async () => {
            await waitFor(() => result.getByTestId("expand-icon-for-sidebar-item-custom-resource-group-some.group.com").click(),
              { timeout: 300 });
          });

          it("renders", () => {
            expect(result.container).toMatchSnapshot();
          });

          it("shows some.group.com group sidebar item", async () => {
            await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resource-group-some.group.com")).toBeInTheDocument(),
              { timeout: 300 });
          });

          it("formats the some.group.com sidebar item title correctly", async () => {
            await waitFor(() => expect(
              result.getByTestId("link-for-sidebar-item-custom-resource-group-some.group.com").firstChild,
            ).toHaveTextContent("some\u200b.group\u200b.com", {
              normalizeWhitespace: false,
            }),
              { timeout: 300 });
          });

          it("shows some-resources group sidebar item", async () => {
            await waitFor(() => expect(
              result.getByTestId("sidebar-item-custom-resource-group-some.group.com/some-resources"),
            ).toBeInTheDocument(),
              { timeout: 300 });
          });

          it("formats the some-resources sidebar item title correctly", async () => {
            await waitFor(() => expect(
              result.getByTestId("sidebar-item-custom-resource-group-some.group.com/some-resources"),
            ).toHaveTextContent("Some Resource"),
              { timeout: 300 });
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
        await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 });
      });

      it("shows Custom Resources sidebar as expandable", async () => {
        await waitFor(() => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
          { timeout: 300 });
      });

      it("does not show SomeResources sidebar", async () => {
        await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
          { timeout: 300 });
      });

      it("does not show Custom Resources Definitions sidebar", async () => {
        await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
          { timeout: 300 });
      });

      describe("when custom resources sidebar item is expanded", () => {
        beforeEach(() => {
          result.getByTestId("expand-icon-for-sidebar-item-custom-resources").click();
        });

        it("renders", () => {
          expect(result.container).toMatchSnapshot();
        });

        it("shows Custom Resources sidebar", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 });
        });

        it("shows Custom Resources sidebar as expandable", async () => {
          await waitFor(() => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
            { timeout: 300 });
        });

        it("does not show SomeResources sidebar", async () => {
          await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-group-some.group.com")).not.toBeInTheDocument(),
            { timeout: 300 });
        });

        it("shows Custom Resources Definitions sidebar", async () => {
          await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resource-definitions")).toBeInTheDocument(),
            { timeout: 300 });
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
      await waitFor(() => expect(result.getByTestId("sidebar-item-custom-resources")).toBeInTheDocument(),
        { timeout: 300 });
    });

    it("shows Custom Resources sidebar as expandable", async () => {
      await waitFor(() => expect(result.getByTestId("expand-icon-for-sidebar-item-custom-resources")).toBeInTheDocument(),
        { timeout: 300 });
    });

    it("does not show Custom Resources Definitions sidebar", async () => {
      await waitFor(() => expect(result.queryByTestId("sidebar-item-custom-resource-definitions")).not.toBeInTheDocument(),
        { timeout: 300 });
    });
  });
});
