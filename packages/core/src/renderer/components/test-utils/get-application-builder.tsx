/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { applicationFeature, startApplicationInjectionToken } from "@freelensapp/application";
import {
  applicationFeatureForElectronMain,
  testUtils as applicationForElectronTestUtils,
} from "@freelensapp/application-for-electron-main";
import { registerFeature } from "@freelensapp/feature-core";
import { namespaceApiInjectable } from "@freelensapp/kube-api-specifics";
import { Namespace } from "@freelensapp/kube-object";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getMessageBridgeFake } from "@freelensapp/messaging-fake-bridge";
import { discoverFor } from "@freelensapp/react-testing-library-discovery";
import { historyInjectionToken } from "@freelensapp/routing";
import { renderFor } from "@freelensapp/test-utils";
import { pipeline } from "@ogre-tools/fp";
import type { DiContainer, Injectable } from "@ogre-tools/injectable";
import { getInjectable } from "@ogre-tools/injectable";
import type { RenderResult } from "@testing-library/react";
import { fireEvent, queryByText } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import { filter, first, join, last, map, matches } from "lodash/fp";
import type { IComputedValue, ObservableMap } from "mobx";
import { action, computed, observable, runInAction } from "mobx";
import React from "react";
import { Router } from "react-router";
import { openMenu } from "react-select-event";
import { Cluster } from "../../../common/cluster/cluster";
import type { Route } from "../../../common/front-end-routing/front-end-route-injection-token";
import type { NavigateToRouteOptions } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import type { NavigateToHelmCharts } from "../../../common/front-end-routing/routes/cluster/helm/charts/navigate-to-helm-charts.injectable";
import navigateToHelmChartsInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/navigate-to-helm-charts.injectable";
import fsInjectable from "../../../common/fs/fs.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import kubeDirectoryPathInjectable from "../../../common/os/kube-directory-path.injectable";
import type { KubeApiResourceDescriptor } from "../../../common/rbac";
import { formatKubeApiResource } from "../../../common/rbac";
import { findComposite } from "../../../common/utils/composite/find-composite/find-composite";
import { getCompositePaths } from "../../../common/utils/composite/get-composite-paths/get-composite-paths";
import extensionInjectable from "../../../extensions/extension-loader/extension/extension.injectable";
import type { LensExtension } from "../../../extensions/lens-extension";
import type { LensMainExtension } from "../../../extensions/lens-main-extension";
import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import mainExtensionsInjectable from "../../../extensions/main-extensions.injectable";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import applicationMenuItemCompositeInjectable from "../../../features/application-menu/main/application-menu-item-composite.injectable";
import selectedNamespacesStorageInjectable from "../../../features/namespace-filtering/renderer/storage.injectable";
import navigateToPreferencesInjectable from "../../../features/preferences/common/navigate-to-preferences.injectable";
import { catalogEntityFromCluster } from "../../../main/cluster/manager";
import shouldStartHiddenInjectable from "../../../main/electron-app/features/should-start-hidden.injectable";
import { getDiForUnitTesting as getMainDi } from "../../../main/getDiForUnitTesting";
import lensProxyPortInjectable from "../../../main/lens-proxy/lens-proxy-port.injectable";
import { applicationWindowInjectionToken } from "../../../main/start-main-application/lens-window/application-window/application-window-injection-token";
import createApplicationWindowInjectable from "../../../main/start-main-application/lens-window/application-window/create-application-window.injectable";
import type { CreateElectronWindow } from "../../../main/start-main-application/lens-window/application-window/create-electron-window.injectable";
import createElectronWindowInjectable from "../../../main/start-main-application/lens-window/application-window/create-electron-window.injectable";
import type { LensWindow } from "../../../main/start-main-application/lens-window/application-window/create-lens-window.injectable";
import type { MinimalTrayMenuItem } from "../../../main/tray/electron-tray/electron-tray.injectable";
import electronTrayInjectable from "../../../main/tray/electron-tray/electron-tray.injectable";
import { getOverrideFsWithFakes } from "../../../test-utils/override-fs-with-fakes";
import { testUsingFakeTime } from "../../../test-utils/use-fake-time";
import activeKubernetesClusterInjectable from "../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterIdInjectable from "../../cluster-frame-context/hosted-cluster-id.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { ClusterFrame } from "../../frames/cluster-frame/cluster-frame";
import { RootFrame } from "../../frames/root-frame/root-frame";
import { getDiForUnitTesting as getRendererDi } from "../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../routes/currently-in-cluster-frame.injectable";
import type { NamespaceStore } from "../namespaces/store";
import namespaceStoreInjectable from "../namespaces/store.injectable";
import type { FakeExtensionOptions } from "./get-extension-fake";
import { getExtensionFakeForMain, getExtensionFakeForRenderer } from "./get-extension-fake";

type MainDiCallback = (container: { mainDi: DiContainer }) => void | Promise<void>;
type WindowDiCallback = (container: { windowDi: DiContainer }) => void | Promise<void>;

type LensWindowWithHelpers = LensWindow & { rendered: RenderResult; di: DiContainer };

const createNamespace = (namespace: string) =>
  new Namespace({
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name: namespace,
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/${namespace}`,
      uid: `namespace-${namespace}`,
    },
  });

const createSubNamespace = (namespace: string, parent: Namespace) =>
  new Namespace({
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name: namespace,
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/${namespace}`,
      uid: `namespace-${namespace}`,
      annotations: {
        "hnc.x-k8s.io/subnamespace-of": parent.getName(),
      },
      labels: {
        [`${parent.getName()}.tree.hnc.x-k8s.io/depth`]: "1",
      },
    },
  });

export interface ApplicationBuilder {
  mainDi: DiContainer;
  setEnvironmentToClusterFrame: () => ApplicationBuilder;

  extensions: {
    enable: (...extensions: FakeExtensionOptions[]) => void;
    disable: (...extensions: FakeExtensionOptions[]) => void;

    get: (id: string) => {
      main: LensMainExtension;

      applicationWindows: Record<string, LensRendererExtension> & {
        only: LensRendererExtension;
      };
    };
  };

  applicationWindow: {
    closeAll: () => void;
    only: LensWindowWithHelpers;
    get: (id: string) => LensWindowWithHelpers;
    getAll: () => LensWindowWithHelpers[];
    create: (id: string) => LensWindowWithHelpers;
  };

  allowKubeResource: (resource: KubeApiResourceDescriptor) => ApplicationBuilder;
  beforeApplicationStart: (callback: MainDiCallback) => ApplicationBuilder;
  afterApplicationStart: (callback: MainDiCallback) => ApplicationBuilder;
  beforeWindowStart: (callback: WindowDiCallback) => ApplicationBuilder;
  afterWindowStart: (callback: WindowDiCallback) => ApplicationBuilder;

  startHidden: () => Promise<void>;
  render: () => Promise<RenderResult>;

  tray: {
    click: (id: string) => Promise<void>;
    get: (id: string) => MinimalTrayMenuItem | null;
    getIconPath: () => string;
  };

  applicationMenu: {
    click: (...path: string[]) => void;
    items: string[][];
  };
  preferences: {
    close: () => void;
    navigate: () => void;
    navigateTo: (route: Route<any>, params: Partial<NavigateToRouteOptions<any>>) => void;
    navigation: {
      click: (id: string) => void;
    };
  };
  namespaces: {
    add: (namespace: string) => void;
    addSubNamespace: (namespace: string, parent: string) => void;
    select: (namespace: string) => void;
  };
  helmCharts: {
    navigate: NavigateToHelmCharts;
  };
  navigateWith: (token: Injectable<() => void, any, void>) => void;
  select: {
    openMenu: (id: string) => { selectOption: (labelText: string) => Promise<void> };
    selectOption: (menuId: string, labelText: string) => Promise<void>;
    getValue: (menuId: string) => string;
  };
}

interface Environment {
  RootComponent: React.ElementType;
  onAllowKubeResource: () => void;
}

export const getApplicationBuilder = (user: UserEvent = userEvent.setup()) => {
  const mainDi = getMainDi();

  runInAction(() => {
    registerFeature(mainDi, applicationFeature, applicationFeatureForElectronMain);

    mainDi.register(mainExtensionsStateInjectable);
  });

  applicationForElectronTestUtils.overrideSideEffectsWithFakes(mainDi);

  testUsingFakeTime();

  const messageBridgeFake = getMessageBridgeFake();

  messageBridgeFake.involve(mainDi);

  const beforeApplicationStartCallbacks: MainDiCallback[] = [];
  const afterApplicationStartCallbacks: MainDiCallback[] = [];
  const beforeWindowStartCallbacks: WindowDiCallback[] = [];
  const afterWindowStartCallbacks: WindowDiCallback[] = [];

  const overrideFsWithFakes = getOverrideFsWithFakes();

  overrideFsWithFakes(mainDi);

  // Set up ~/.kube as existing as a folder
  {
    const { ensureDirSync } = mainDi.inject(fsInjectable);
    const kubeDirectoryPath = mainDi.inject(kubeDirectoryPathInjectable);

    ensureDirSync(kubeDirectoryPath);
  }

  let environment = environments.application;

  mainDi.override(mainExtensionsInjectable, (di) => {
    const mainExtensionsState = di.inject(mainExtensionsStateInjectable);

    return computed(() => [...mainExtensionsState.values()]);
  });

  let trayMenuIconPath: string;

  const traySetMenuItemsMock = jest.fn<any, [MinimalTrayMenuItem[]]>();

  mainDi.override(electronTrayInjectable, () => ({
    start: () => {},
    stop: () => {},
    setMenuItems: traySetMenuItemsMock,
    setIconPath: (path) => {
      trayMenuIconPath = path;
    },
  }));

  const windowHelpers: ApplicationWindowHelpers = new Map();

  const createElectronWindowFake: CreateElectronWindow = (configuration) => {
    const windowId = configuration.id;

    const windowDi = getRendererDi();

    messageBridgeFake.involve(windowDi);

    overrideFsWithFakes(windowDi);

    runInAction(() => {
      registerFeature(windowDi, applicationFeature);

      windowDi.register(rendererExtensionsStateInjectable);
    });

    windowDi.override(currentlyInClusterFrameInjectable, () => environment === environments.clusterFrame);

    windowDi.override(rendererExtensionsInjectable, (di) => {
      const rendererExtensionState = di.inject(rendererExtensionsStateInjectable);

      return computed(() => [...rendererExtensionState.values()]);
    });

    let rendered: RenderResult;

    windowHelpers.set(windowId, {
      di: windowDi,
      getRendered: () => rendered,
    });

    return {
      show: () => {},
      close: () => {},
      loadFile: async () => {},
      loadUrl: async () => {
        for (const callback of beforeWindowStartCallbacks) {
          await callback({ windowDi });
        }

        const startApplication = windowDi.inject(startApplicationInjectionToken);

        await startApplication();

        for (const callback of afterWindowStartCallbacks) {
          await callback({ windowDi });
        }

        const history = windowDi.inject(historyInjectionToken);

        const render = renderFor(windowDi);

        rendered = render(
          <Router history={history}>
            <environment.RootComponent />
          </Router>,
        );
      },

      send: ({ channel: channelId, data }) => {
        const sendMessageToChannel = mainDi.inject(sendMessageToChannelInjectionToken);

        sendMessageToChannel({ id: channelId }, data);
      },

      reload: () => {
        throw new Error("Tried to reload application window which is not implemented yet.");
      },
    };
  };

  mainDi.override(createElectronWindowInjectable, () => createElectronWindowFake);

  let applicationHasStarted = false;

  const namespaceItems = observable.array<Namespace>();
  const selectedNamespaces = observable.set<string>();

  const startApp = async ({ shouldStartHidden }: { shouldStartHidden: boolean }) => {
    const startApplication = mainDi.inject(startApplicationInjectionToken);

    mainDi.inject(lensProxyPortInjectable).set(42);

    for (const callback of beforeApplicationStartCallbacks) {
      await callback({ mainDi });
    }

    mainDi.override(shouldStartHiddenInjectable, () => shouldStartHidden);
    await startApplication();

    for (const callback of afterApplicationStartCallbacks) {
      await callback({ mainDi });
    }

    applicationHasStarted = true;
  };

  const builder: ApplicationBuilder = {
    mainDi,
    applicationWindow: {
      closeAll: () => {
        const lensWindows = mainDi.injectMany(applicationWindowInjectionToken);

        for (const lensWindow of lensWindows) {
          lensWindow.close();
        }

        document.documentElement.innerHTML = "";
      },

      get only() {
        const applicationWindows = builder.applicationWindow.getAll();

        if (applicationWindows.length > 1) {
          throw new Error("Tried to get only application window when there are multiple windows.");
        }

        const applicationWindow = first(applicationWindows);

        if (!applicationWindow) {
          throw new Error("Tried to get only application window when there are no windows.");
        }

        return applicationWindow;
      },

      getAll: () => mainDi.injectMany(applicationWindowInjectionToken).map(toWindowWithHelpersFor(windowHelpers)),

      get: (id) => {
        const applicationWindow = builder.applicationWindow.getAll().find((window) => window.id === id);

        if (!applicationWindow) {
          throw new Error(`Tried to get application window with ID "${id}" but it was not found.`);
        }

        return applicationWindow;
      },

      create: (id) => {
        const createApplicationWindow = mainDi.inject(createApplicationWindowInjectable);

        createApplicationWindow(id);

        return builder.applicationWindow.get(id);
      },
    },
    namespaces: {
      add: action((namespace) => {
        namespaceItems.push(createNamespace(namespace));
      }),
      addSubNamespace: action((namespace, parent) => {
        const parentNamespace = namespaceItems.find((n) => n.getName() === parent);

        assert(parentNamespace, `Cannot find namespace with name="${parent}"`);

        namespaceItems.push(createSubNamespace(namespace, parentNamespace));
      }),
      select: action((namespace) => {
        const selectedNamespacesStorage = builder.applicationWindow.only.di.inject(selectedNamespacesStorageInjectable);

        selectedNamespaces.add(namespace);
        selectedNamespacesStorage.set([...selectedNamespaces]);
      }),
    },
    applicationMenu: {
      get items() {
        const composite = mainDi.inject(applicationMenuItemCompositeInjectable).get();

        return getCompositePaths(composite);
      },

      click: (...path: string[]) => {
        const composite = mainDi.inject(applicationMenuItemCompositeInjectable).get();

        const clickableMenuItem = findComposite(...path)(composite).value;

        if (clickableMenuItem.kind === "clickable-menu-item") {
          // Todo: prevent leaking of Electron
          (clickableMenuItem.onClick as any)();
        } else {
          throw new Error(
            `Tried to trigger clicking of an application menu item, but item at path '${path.join(" -> ")}' isn't clickable.`,
          );
        }
      },
    },

    tray: {
      get: (id: string) => {
        const lastCall = last(traySetMenuItemsMock.mock.calls);

        assert(lastCall);

        return lastCall[0].find(matches({ id })) ?? null;
      },

      getIconPath: () => trayMenuIconPath,

      click: async (id: string) => {
        const lastCall = last(traySetMenuItemsMock.mock.calls);

        assert(lastCall);

        const trayMenuItems = lastCall[0];

        const menuItem = trayMenuItems.find(matches({ id })) ?? null;

        if (!menuItem) {
          const availableIds = pipeline(
            trayMenuItems,
            filter((item) => !!item.click),
            map((item) => item.id),
            join(", "),
          );

          throw new Error(
            `Tried to click tray menu item with ID ${id} which does not exist. Available IDs are: "${availableIds}"`,
          );
        }

        if (!menuItem.enabled) {
          throw new Error(`Tried to click tray menu item with ID ${id} which is disabled.`);
        }

        await menuItem.click?.();
      },
    },

    preferences: {
      close: () => {
        const rendered = builder.applicationWindow.only.rendered;

        const link = rendered.getByTestId("close-preferences");

        fireEvent.click(link);
      },

      navigate: () => {
        const windowDi = builder.applicationWindow.only.di;

        const navigateToPreferences = windowDi.inject(navigateToPreferencesInjectable);

        navigateToPreferences();
      },

      navigateTo: (route: Route<any>, params: Partial<NavigateToRouteOptions<any>>) => {
        const windowDi = builder.applicationWindow.only.di;

        const navigateToRoute = windowDi.inject(navigateToRouteInjectionToken);

        navigateToRoute(route, params);
      },

      navigation: {
        click: (pathId: string) => {
          const { rendered } = builder.applicationWindow.only;

          const discover = discoverFor(() => rendered);

          const { discovered: link } = discover.getSingleElement("preference-tab-link", pathId);

          fireEvent.click(link);
        },
      },
    },

    helmCharts: {
      navigate: (parameters) => {
        const windowDi = builder.applicationWindow.only.di;

        const navigateToHelmCharts = windowDi.inject(navigateToHelmChartsInjectable);

        navigateToHelmCharts(parameters);
      },
    },

    navigateWith: (token) => {
      const windowDi = builder.applicationWindow.only.di;
      const navigate = windowDi.inject(token);

      navigate();
    },

    setEnvironmentToClusterFrame: () => {
      environment = environments.clusterFrame;

      const cluster = new Cluster({
        id: "some-cluster-id",
        contextName: "some-context-name",
        kubeConfigPath: "/some-path-to-kube-config",
      });

      builder.beforeWindowStart(({ windowDi }) => {
        windowDi.override(hostedClusterIdInjectable, () => cluster.id);

        // TODO: Remove this once we moved catalog to new IPC injectables
        windowDi.override(activeKubernetesClusterInjectable, () => computed(() => catalogEntityFromCluster(cluster)));

        // TODO: Figure out a way to remove this stub.
        windowDi.override(
          namespaceStoreInjectable,
          () =>
            ({
              isLoaded: true,
              get contextNamespaces() {
                return Array.from(selectedNamespaces);
              },
              get allowedNamespaces() {
                return Array.from(namespaceItems, (n) => n.getName());
              },
              contextItems: namespaceItems,
              api: windowDi.inject(namespaceApiInjectable),
              items: namespaceItems,
              selectNamespaces: () => {},
              selectSingle: () => {},
              getByPath: () => undefined,
              pickOnlySelected: () => [],
              isSelectedAll: () => false,
              getTotalCount: () => namespaceItems.length,
              isSelected: () => false,
            }) as Partial<NamespaceStore> as NamespaceStore,
        );
      });

      builder.beforeApplicationStart(({ mainDi }) => {
        const writeJsonSync = mainDi.inject(writeJsonSyncInjectable);

        writeJsonSync("/some-path-to-kube-config", {
          clusters: [
            {
              name: cluster.contextName,
            },
          ],
          users: [
            {
              name: "some-user-name",
            },
          ],
          contexts: [
            {
              name: cluster.contextName,
              context: {
                cluster: cluster.contextName,
                user: "some-user-name",
              },
            },
          ],
          "current-context": cluster.contextName,
        });
        writeJsonSync("/some-directory-for-app-data/some-product-name/lens-cluster-store.json", {
          clusters: [
            {
              id: cluster.id,
              kubeConfigPath: "/some-path-to-kube-config",
              contextName: cluster.contextName,
            },
          ],
          __internal__: { migrations: { version: "6.4.0" } },
        });
      });

      return builder;
    },

    extensions: {
      get: (id: string) => {
        const windowInstances = pipeline(
          builder.applicationWindow.getAll(),

          map((window): [string, LensRendererExtension] => [
            window.id,
            findExtensionInstance(window.di, rendererExtensionsInjectable, id),
          ]),

          (items) => Object.fromEntries(items),
        );

        return {
          main: findExtensionInstance(mainDi, mainExtensionsInjectable, id),

          applicationWindows: {
            get only() {
              return findExtensionInstance(builder.applicationWindow.only.di, rendererExtensionsInjectable, id);
            },

            ...windowInstances,
          },
        };
      },

      enable: (...extensions) => {
        builder.afterWindowStart(
          action(({ windowDi }) => {
            extensions
              .map(getExtensionFakeForRenderer)
              .forEach(enableExtensionFor(windowDi, rendererExtensionsStateInjectable));
          }),
        );

        builder.afterApplicationStart(
          action(({ mainDi }) => {
            extensions.map(getExtensionFakeForMain).forEach(enableExtensionFor(mainDi, mainExtensionsStateInjectable));
          }),
        );
      },

      disable: (...extensions) => {
        builder.afterWindowStart(({ windowDi }) => {
          extensions.forEach(disableExtensionFor(windowDi, rendererExtensionsStateInjectable));
        });

        builder.afterApplicationStart(({ mainDi }) => {
          extensions.forEach(disableExtensionFor(mainDi, mainExtensionsStateInjectable));
        });
      },
    },

    allowKubeResource: (resource) => {
      environment.onAllowKubeResource();

      const windowDi = builder.applicationWindow.only.di;
      const cluster = windowDi.inject(hostedClusterInjectable);

      assert(
        cluster,
        "For some reason the hosted cluster is not yet available, are you running in an 'afterWindowStart' callback?",
      );

      runInAction(() => {
        cluster.resourcesToShow.add(formatKubeApiResource(resource));
      });

      return builder;
    },

    beforeApplicationStart(callback) {
      if (applicationHasStarted) {
        callback({ mainDi });
      }

      beforeApplicationStartCallbacks.push(callback);

      return builder;
    },

    afterApplicationStart(callback) {
      if (applicationHasStarted) {
        callback({ mainDi });
      }

      afterApplicationStartCallbacks.push(callback);

      return builder;
    },

    beforeWindowStart(callback) {
      const alreadyRenderedWindows = builder.applicationWindow.getAll();

      alreadyRenderedWindows.forEach((window) => {
        callback({ windowDi: window.di });
      });

      beforeWindowStartCallbacks.push(callback);

      return builder;
    },

    afterWindowStart(callback) {
      const alreadyRenderedWindows = builder.applicationWindow.getAll();

      alreadyRenderedWindows.forEach((window) => {
        callback({ windowDi: window.di });
      });

      afterWindowStartCallbacks.push(callback);

      return builder;
    },

    startHidden: async () => {
      await startApp({ shouldStartHidden: true });
    },

    async render() {
      await startApp({ shouldStartHidden: false });

      return builder.applicationWindow.get("first-application-window").rendered;
    },

    select: {
      openMenu: (menuId) => {
        const rendered = builder.applicationWindow.only.rendered;

        const select = rendered.baseElement.querySelector<HTMLElement>(`#${menuId}`);

        assert(select, `Could not find select with ID "${menuId}"`);

        openMenu(select);

        return {
          selectOption: selectOptionFor(builder, user, menuId),
        };
      },

      selectOption: async (menuId, labelText) => await selectOptionFor(builder, user, menuId)(labelText),

      getValue: (menuId) => {
        const rendered = builder.applicationWindow.only.rendered;

        const select = rendered.baseElement.querySelector<HTMLInputElement>(`#${menuId}`);

        assert(select, `Could not find select with ID "${menuId}"`);

        const controlElement = select.closest(".Select__control");

        assert(controlElement, `Could not find select value for menu with ID "${menuId}"`);

        return controlElement.textContent || "";
      },
    },
  };

  return builder;
};

export const rendererExtensionsStateInjectable = getInjectable({
  id: "renderer-extensions-state",
  instantiate: () => observable.map<string, LensRendererExtension>(),
});

const mainExtensionsStateInjectable = getInjectable({
  id: "main-extensions-state",
  instantiate: () => observable.map<string, LensMainExtension>(),
});

const findExtensionInstance = <T extends LensExtension>(
  di: DiContainer,
  injectable: Injectable<IComputedValue<T[]>, any, any>,
  id: string,
) => {
  const instance = di
    .inject(injectable)
    .get()
    .find((ext) => ext.id === id);

  if (!instance) {
    throw new Error(`Tried to get extension with ID ${id}, but it didn't exist`);
  }

  return instance;
};

type ApplicationWindowHelpers = Map<string, { di: DiContainer; getRendered: () => RenderResult }>;

const toWindowWithHelpersFor =
  (windowHelpers: ApplicationWindowHelpers) =>
  (applicationWindow: LensWindow): LensWindowWithHelpers => ({
    ...applicationWindow,

    get rendered() {
      const helpers = windowHelpers.get(applicationWindow.id);

      assert(helpers, `Tried to get rendered for application window "${applicationWindow.id}" before it was started.`);

      return helpers.getRendered();
    },

    get di() {
      const helpers = windowHelpers.get(applicationWindow.id);

      assert(helpers, `Tried to get rendered for application window "${applicationWindow.id}" before it was started.`);

      return helpers.di;
    },
  });

const environments = {
  application: {
    RootComponent: RootFrame,

    onAllowKubeResource: () => {
      throw new Error("Tried to allow kube resource when environment is not cluster frame.");
    },
  } as Environment,

  clusterFrame: {
    RootComponent: ClusterFrame,
    onAllowKubeResource: () => {},
  } as Environment,
};

const selectOptionFor = (builder: ApplicationBuilder, user: UserEvent, menuId: string) => async (labelText: string) => {
  const rendered = builder.applicationWindow.only.rendered;

  const menuOptions = rendered.baseElement.querySelector<HTMLElement>(`.${menuId}-options`);

  assert(menuOptions, `Could not find select options for menu with ID "${menuId}"`);

  const option = queryByText(menuOptions, labelText);

  assert(option, `Could not find select option with label "${labelText}" for menu with ID "${menuId}"`);

  await user.click(option);
};

function enableExtensionFor(di: DiContainer, stateInjectable: Injectable<ObservableMap<string, any>, any, any>) {
  const extensionState = di.inject(stateInjectable);

  return (instance: LensExtension) => {
    const extension = di.inject(extensionInjectable, instance);

    extension.register();
    extensionState.set(instance.id, instance);
  };
}

function disableExtensionFor(di: DiContainer, stateInjectable: Injectable<ObservableMap<string, any>, unknown, void>) {
  return (extension: FakeExtensionOptions) => {
    const extensionsState = di.inject(stateInjectable);
    const instance = extensionsState.get(extension.id);

    if (!instance) {
      throw new Error(`Tried to disable extension with ID "${extension.id}", but it wasn't enabled`);
    }

    const injectable = di.inject(extensionInjectable, instance);

    injectable.deregister();
    extensionsState.delete(extension.id);
  };
}
