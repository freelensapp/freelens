/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import { act } from "@testing-library/react";
import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frontEndRouteInjectionToken } from "../../common/front-end-routing/front-end-route-injection-token";
import { navigateToRouteInjectionToken } from "../../common/front-end-routing/navigate-to-route-injection-token";
import navigateToWorkloadsOverviewInjectable from "../../common/front-end-routing/routes/cluster/workloads/overview/navigate-to-workloads-overview.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import showDetailsInjectable from "../../renderer/components/kube-detail-params/show-details.injectable";
import { KubeObjectMenu } from "../../renderer/components/kube-object-menu";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { routeSpecificComponentInjectionToken } from "../../renderer/routes/route-specific-component-injection-token";
import { Broken, errorMessage, expectLoggedRenderError, extensionName, stubLogger } from "./test-utils/extension-error";

import type { KubeApi } from "@freelensapp/kube-api";

import type { RenderResult } from "@testing-library/react";

import type { KubeObjectStore } from "../../common/k8s-api/kube-object.store";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import type { FakeExtensionOptions } from "../../renderer/components/test-utils/get-extension-fake";
import type { LoggerStub } from "./test-utils/extension-error";

// An error thrown while React renders a component of an extension replaces that component alone: the host puts a
// boundary around every component an extension registers, and the UI of the host around it stays.

const extensionId = "some-extension-id";
const kindAndVersions = { kind: "some-kind", apiVersions: ["some-api-version"] };

const getKubeObject = (name: string, resourceVersion = "1") =>
  KubeObject.create({
    apiVersion: "some-api-version",
    kind: "some-kind",
    metadata: {
      uid: `uid-of-${name}`,
      name,
      resourceVersion,
      namespace: "some-namespace",
      selfLink: `/api/some-api-version/namespaces/some-namespace/some-kind/${name}`,
    },
  });

// Throws for the object named "broken-object" only, so that a component can be shown again for another object.
const ComponentOfObject = ({ object }: { object: KubeObject }) => {
  if (object.getName() === "broken-object") {
    throw new Error(errorMessage);
  }

  return <div data-testid="extension-component">{`Component of ${object.getName()}`}</div>;
};

// Throws for the first version of an object only, as a component can for an object that changed since.
const ComponentOfVersion = ({ object }: { object: KubeObject }) => {
  if (object.getResourceVersion() === "1") {
    throw new Error(errorMessage);
  }

  return <div data-testid="extension-component">{`Component of version ${object.getResourceVersion()}`}</div>;
};

describe("error boundaries around the components of an extension, in the cluster frame", () => {
  let builder: ApplicationBuilder;
  let rendered: RenderResult;
  let logger: LoggerStub;

  // The extension is enabled after the window renders, and after `beforeEnabling`, as for an extension that the user
  // enables in a running window.
  const render = async (rendererOptions: FakeExtensionOptions["rendererOptions"], beforeEnabling = () => {}) => {
    rendered = await builder.render();
    beforeEnabling();
    builder.extensions.enable({ id: extensionId, name: extensionName, rendererOptions });
    await act(async () => {});
  };

  beforeEach(() => {
    builder = getApplicationBuilder();
    builder.setEnvironmentToClusterFrame();
    logger = stubLogger(builder);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("clusterPages", () => {
    beforeEach(async () => {
      await render({ clusterPages: [{ components: { Page: Broken } }] });

      act(() => {
        builder.extensions.get(extensionId).applicationWindows.only.navigate();
      });
    });

    it("shows the error view in place of the page, and keeps the sidebar", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
      expect(rendered.getByTestId("cluster-sidebar")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "clusterPages");
    });
  });

  describe("clusterPageMenus", () => {
    beforeEach(async () => {
      await render({
        clusterPages: [{ components: { Page: () => <div data-testid="extension-page" /> } }],
        clusterPageMenus: [{ title: "Some menu", target: { pageId: "" }, components: { Icon: Broken } }],
      });
    });

    it("renders nothing in place of the icon, and keeps the item and the sidebar", () => {
      expect(rendered.getByTestId("cluster-sidebar")).toHaveTextContent("Some menu");
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "clusterPageMenus");
    });
  });

  describe("clusterFrameComponents", () => {
    beforeEach(async () => {
      await render({
        clusterFrameComponents: [
          { id: "broken-component", Component: Broken, shouldRender: computed(() => true) },
          {
            id: "other-component",
            Component: () => <div data-testid="extension-component" />,
            shouldRender: computed(() => true),
          },
        ],
      });
    });

    it("renders nothing in place of the component, and keeps the cluster view and the other components", () => {
      expect(rendered.getByTestId("cluster-sidebar")).toBeInTheDocument();
      expect(rendered.getByTestId("extension-component")).toBeInTheDocument();
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "clusterFrameComponents");
    });
  });

  describe("kubeWorkloadsOverviewItems", () => {
    beforeEach(async () => {
      await render({ kubeWorkloadsOverviewItems: [{ components: { Details: Broken } }] });

      act(() => {
        builder.applicationWindow.only.di.inject(navigateToWorkloadsOverviewInjectable)();
      });
    });

    it("shows the error view in place of the item, and keeps the overview", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
      expect(rendered.getByTestId("page-for-workloads-overview")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "kubeWorkloadsOverviewItems");
    });
  });

  describe("kubeObjectDetailItems", () => {
    const showDetailsOf = async (name: string) => {
      await act(async () => {
        builder.applicationWindow.only.di.inject(showDetailsInjectable)(
          `/api/some-api-version/namespaces/some-namespace/some-kind/${name}`,
        );
      });
    };

    beforeEach(async () => {
      builder.afterWindowStart(({ windowDi }) => {
        const apiManager = windowDi.inject(apiManagerInjectable);
        const api = { apiBase: "/api/some-api-version/some-kind" } as Partial<
          KubeApi<KubeObject>
        > as KubeApi<KubeObject>;
        const store = {
          api,
          loadFromPath: async (path: string) => getKubeObject(path.split("/").at(-1) ?? ""),
          getByPath() {},
        } as Partial<KubeObjectStore<KubeObject>> as KubeObjectStore<KubeObject>;

        apiManager.registerApi(api);
        apiManager.registerStore(store);
      });

      await render({
        kubeObjectDetailItems: [{ ...kindAndVersions, components: { Details: ComponentOfObject } }],
      });

      await showDetailsOf("broken-object");
    });

    it("shows the error view in place of the item, and keeps the details panel", () => {
      expect(rendered.getByText("App crash at")).toBeInTheDocument();
      expect(rendered.getByText("some-kind: broken-object")).toBeInTheDocument();
    });

    it("logs the error with the name of the extension", () => {
      expectLoggedRenderError(logger, "kubeObjectDetailItems", "ComponentOfObject");
    });

    it("renders the item again for another object", async () => {
      await showDetailsOf("other-object");

      expect(rendered.getByTestId("extension-component")).toHaveTextContent("Component of other-object");
      expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
    });
  });

  describe("kubeObjectMenuItems", () => {
    const shownObject = observable.box<KubeObject>(getKubeObject("broken-object"), { deep: false });

    const testRouteInjectable = getInjectable({
      id: "test-route",
      instantiate: () => ({ path: "/test-route", clusterFrame: true, isEnabled: computed(() => true) }),
      injectionToken: frontEndRouteInjectionToken,
    });

    const testRouteComponentInjectable = getInjectable({
      id: "test-route-component",
      instantiate: (di) => ({
        route: di.inject(testRouteInjectable),
        Component: observer(() => (
          <div data-testid="host-around-the-menu">
            <KubeObjectMenu toolbar={true} object={shownObject.get()} />
          </div>
        )),
      }),
      injectionToken: routeSpecificComponentInjectionToken,
    });

    const show = (object: KubeObject) => {
      act(() => {
        runInAction(() => shownObject.set(object));
      });
    };

    const renderWith = async (MenuItem: typeof ComponentOfObject, object: KubeObject) => {
      shownObject.set(object);

      builder.beforeWindowStart(({ windowDi }) => {
        runInAction(() => windowDi.register(testRouteInjectable, testRouteComponentInjectable));
      });

      await render({ kubeObjectMenuItems: [{ ...kindAndVersions, components: { MenuItem } }] }, () => {
        const windowDi = builder.applicationWindow.only.di;

        act(() => {
          windowDi.inject(navigateToRouteInjectionToken)(windowDi.inject(testRouteInjectable));
        });
      });
    };

    describe("given the item throws for the object", () => {
      beforeEach(async () => {
        await renderWith(ComponentOfObject, getKubeObject("broken-object"));
      });

      it("renders nothing in place of the item, and keeps the menu", () => {
        expect(rendered.getByTestId("host-around-the-menu")).toBeInTheDocument();
        expect(rendered.queryByTestId("extension-component")).not.toBeInTheDocument();
        expect(rendered.queryByText("App crash at")).not.toBeInTheDocument();
      });

      it("logs the error with the name of the extension", () => {
        expectLoggedRenderError(logger, "kubeObjectMenuItems", "ComponentOfObject");
      });

      it("renders the item again for another object", () => {
        show(getKubeObject("other-object"));

        expect(rendered.getByTestId("extension-component")).toHaveTextContent("Component of other-object");
      });
    });

    describe("given the item throws for a version of the object", () => {
      beforeEach(async () => {
        await renderWith(ComponentOfVersion, getKubeObject("some-object", "1"));
      });

      it("renders the item again for a new version of the same object", () => {
        expect(rendered.queryByTestId("extension-component")).not.toBeInTheDocument();

        show(getKubeObject("some-object", "2"));

        expect(rendered.getByTestId("extension-component")).toHaveTextContent("Component of version 2");
      });
    });
  });
});
