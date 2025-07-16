import isFlatpakPackageInjectable from "../../common/vars/is-flatpak-package.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import * as extensions from "../extension-api";

describe("Extensions API", () => {
  it("should export Common, Main, and Renderer", () => {
    expect(extensions).toHaveProperty("Common");
    expect(extensions).toHaveProperty("Main");
    expect(extensions).toHaveProperty("Renderer");
  });

  describe("Common API", () => {
    it("Common should export App, Catalog, EventBus, Proxy, Store, Types, Util, logger", () => {
      expect(extensions.Common).toHaveProperty("App");
      expect(extensions.Common).toHaveProperty("Catalog");
      expect(extensions.Common).toHaveProperty("EventBus");
      expect(extensions.Common).toHaveProperty("Proxy");
      expect(extensions.Common).toHaveProperty("Store");
      expect(extensions.Common).toHaveProperty("Types");
      expect(extensions.Common).toHaveProperty("Util");
      expect(extensions.Common).toHaveProperty("logger");
    });

    describe("App object", () => {
      beforeEach(async () => {
        const di = getDiForUnitTesting();
        di.override(buildVersionInitializable.stateToken, () => "1.2.3");
        di.override(isFlatpakPackageInjectable, () => false);
      });

      it("should have Preferences with getKubectlPath", () => {
        expect(extensions.Common.App).toHaveProperty("Preferences");
        expect(extensions.Common.App.Preferences).toHaveProperty("getKubectlPath");
        expect(typeof extensions.Common.App.Preferences.getKubectlPath).toBe("function");
      });

      it("should have getEnabledExtensions method", () => {
        expect(extensions.Common.App).toHaveProperty("getEnabledExtensions");
        expect(typeof extensions.Common.App.getEnabledExtensions).toBe("function");
      });

      it("should have version, appName, isFlatpak, isSnap, isWindows, isMac, isLinux, lensBuildEnvironment as getters", () => {
        expect(() => extensions.Common.App.version).not.toThrow();
        expect(() => extensions.Common.App.appName).not.toThrow();
        expect(() => extensions.Common.App.isFlatpak).not.toThrow();
        expect(() => extensions.Common.App.isSnap).not.toThrow();
        expect(() => extensions.Common.App.isWindows).not.toThrow();
        expect(() => extensions.Common.App.isMac).not.toThrow();
        expect(() => extensions.Common.App.isLinux).not.toThrow();
      });

      it("should have slackUrl and issuesTrackerUrl properties", () => {
        expect(extensions.Common.App).toHaveProperty("slackUrl");
        expect(extensions.Common.App).toHaveProperty("issuesTrackerUrl");
      });
    });

    describe("Catalog API", () => {
      it("should export kubernetesClusterCategory", () => {
        expect(extensions.Common.Catalog).toHaveProperty("kubernetesClusterCategory");
      });

      it("should export GeneralEntity, KubernetesCluster, WebLink", () => {
        expect(extensions.Common.Catalog).toHaveProperty("GeneralEntity");
        expect(extensions.Common.Catalog).toHaveProperty("KubernetesCluster");
        expect(extensions.Common.Catalog).toHaveProperty("WebLink");
      });
    });

    describe("EventBus API", () => {
      it("should export appEventBus", () => {
        expect(extensions.Common.EventBus).toHaveProperty("appEventBus");
      });
    });

    describe("Proxy API", () => {
      it("should be defined", () => {
        expect(extensions.Common.Proxy).toBeDefined();
      });
    });

    describe("Store API", () => {
      it("should be defined", () => {
        expect(extensions.Common.Store.ExtensionStore).toBeDefined();
      });
    });

    describe("Types API", () => {
      it("should be defined", () => {
        expect(extensions.Common.Types).toBeDefined();
      });
    });

    describe("Util API", () => {
      it("should export openExternal and openBrowser functions", () => {
        expect(extensions.Common.Util).toHaveProperty("openExternal");
        expect(typeof extensions.Common.Util.openExternal).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("openBrowser");
        expect(typeof extensions.Common.Util.openBrowser).toBe("function");
      });

      it("should export getAppVersion function", () => {
        expect(extensions.Common.Util).toHaveProperty("getAppVersion");
        expect(typeof extensions.Common.Util.getAppVersion).toBe("function");
      });

      it("should export utility functions from @freelensapp/utilities", () => {
        expect(extensions.Common.Util).toHaveProperty("debouncePromise");
        expect(typeof extensions.Common.Util.debouncePromise).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("delay");
        expect(typeof extensions.Common.Util.delay).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("noop");
        expect(typeof extensions.Common.Util.noop).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("formatDuration");
        expect(typeof extensions.Common.Util.formatDuration).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("cssNames");
        expect(typeof extensions.Common.Util.cssNames).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("readonly");
        expect(typeof extensions.Common.Util.readonly).toBe("function");
        expect(extensions.Common.Util).toHaveProperty("json");
        expect(typeof extensions.Common.Util.json.parse).toBe("function");
      });

      it("should export observableCrate factory", () => {
        expect(extensions.Common.Util).toHaveProperty("observableCrate");
        expect(typeof extensions.Common.Util.observableCrate).toBe("function");
      });

      it("should export iter object with chain method", () => {
        expect(extensions.Common.Util).toHaveProperty("iter");
        expect(extensions.Common.Util.iter).toHaveProperty("chain");
        expect(typeof extensions.Common.Util.iter.chain).toBe("function");
      });

      it("should export array object with filled method", () => {
        expect(extensions.Common.Util).toHaveProperty("array");
        expect(extensions.Common.Util.array).toHaveProperty("filled");
        expect(typeof extensions.Common.Util.array.filled).toBe("function");
      });

      it("should export object helpers", () => {
        expect(extensions.Common.Util).toHaveProperty("object");
        expect(extensions.Common.Util.object).toHaveProperty("fromEntries");
        expect(typeof extensions.Common.Util.object.fromEntries).toBe("function");
        expect(extensions.Common.Util.object).toHaveProperty("keys");
        expect(typeof extensions.Common.Util.object.keys).toBe("function");
        expect(extensions.Common.Util.object).toHaveProperty("entries");
        expect(typeof extensions.Common.Util.object.entries).toBe("function");
      });
    });
  });

  describe("Main API", () => {
    it("should export LensExtension and Ipc", () => {
      expect(extensions.Main).toHaveProperty("LensExtension");
      expect(extensions.Main).toHaveProperty("Ipc");
    });

    it("should export Catalog, K8sApi, Navigation, Power namespaces", () => {
      expect(extensions.Main).toHaveProperty("Catalog");
      expect(extensions.Main).toHaveProperty("K8sApi");
      expect(extensions.Main).toHaveProperty("Navigation");
      expect(extensions.Main).toHaveProperty("Power");
    });

    describe("Catalog namespace", () => {
      it("should export catalogCategories and catalogEntities", () => {
        expect(extensions.Main.Catalog).toHaveProperty("catalogCategories");
        expect(extensions.Main.Catalog).toHaveProperty("catalogEntities");
      });
    });

    describe("K8sApi namespace", () => {
      it("should export isAllowedResource and other API objects", () => {
        expect(extensions.Main.K8sApi).toHaveProperty("isAllowedResource");
        expect(typeof extensions.Main.K8sApi.isAllowedResource).toBe("function");
        expect(extensions.Main.K8sApi).toHaveProperty("apiManager");
        expect(extensions.Main.K8sApi).toHaveProperty("forCluster");
        expect(extensions.Main.K8sApi).toHaveProperty("forRemoteCluster");
        expect(extensions.Main.K8sApi).toHaveProperty("createResourceStack");
        expect(extensions.Main.K8sApi).toHaveProperty("getPodsByOwnerId");
      });
    });

    describe("Navigation namespace", () => {
      it("should export navigate function", () => {
        expect(extensions.Main.Navigation).toHaveProperty("navigate");
        expect(typeof extensions.Main.Navigation.navigate).toBe("function");
      });
    });

    describe("Power namespace", () => {
      it("should export onSuspend, onResume, onShutdown functions", () => {
        expect(extensions.Main.Power).toHaveProperty("onSuspend");
        expect(typeof extensions.Main.Power.onSuspend).toBe("function");
        expect(extensions.Main.Power).toHaveProperty("onResume");
        expect(typeof extensions.Main.Power.onResume).toBe("function");
        expect(extensions.Main.Power).toHaveProperty("onShutdown");
        expect(typeof extensions.Main.Power.onShutdown).toBe("function");
      });
    });
  });

  describe("Renderer API", () => {
    it("should export LensExtension and Ipc", () => {
      expect(extensions.Renderer).toHaveProperty("LensExtension");
      expect(extensions.Renderer).toHaveProperty("Ipc");
    });

    it("should export Catalog, Component, K8sApi, Navigation, Theme namespaces", () => {
      expect(extensions.Renderer).toHaveProperty("Catalog");
      expect(extensions.Renderer).toHaveProperty("Component");
      expect(extensions.Renderer).toHaveProperty("K8sApi");
      expect(extensions.Renderer).toHaveProperty("Navigation");
      expect(extensions.Renderer).toHaveProperty("Theme");
    });

    describe("Catalog namespace", () => {
      it("should export catalogCategories and catalogEntities", () => {
        expect(extensions.Renderer.Catalog).toHaveProperty("catalogCategories");
        expect(extensions.Renderer.Catalog).toHaveProperty("catalogEntities");
      });
      it("should export activeCluster", () => {
        expect(extensions.Renderer.Catalog).toHaveProperty("activeCluster");
      });
    });

    describe("Component namespace", () => {
      it("should export ConfirmDialog and CommandOverlay", () => {
        expect(extensions.Renderer.Component).toHaveProperty("ConfirmDialog");
        expect(extensions.Renderer.Component).toHaveProperty("CommandOverlay");
      });

      it("should export Notifications object", () => {
        expect(extensions.Renderer.Component).toHaveProperty("Notifications");
        expect(extensions.Renderer.Component.Notifications).toHaveProperty("ok");
        expect(extensions.Renderer.Component.Notifications).toHaveProperty("error");
        expect(extensions.Renderer.Component.Notifications).toHaveProperty("info");
        expect(extensions.Renderer.Component.Notifications).toHaveProperty("shortInfo");
        expect(extensions.Renderer.Component.Notifications).toHaveProperty("checkedError");
      });

      it("should export notificationsStore", () => {
        expect(extensions.Renderer.Component).toHaveProperty("notificationsStore");
      });

      it("should export terminalStore and logTabStore", () => {
        expect(extensions.Renderer.Component).toHaveProperty("terminalStore");
        expect(extensions.Renderer.Component).toHaveProperty("logTabStore");
      });

      it("should export UI components from renderer/components", () => {
        expect(extensions.Renderer.Component).toHaveProperty("Avatar");
        expect(extensions.Renderer.Component).toHaveProperty("Badge");
        expect(extensions.Renderer.Component).toHaveProperty("BarChart");
        expect(extensions.Renderer.Component).toHaveProperty("Chart");
        expect(extensions.Renderer.Component).toHaveProperty("Checkbox");
        expect(extensions.Renderer.Component).toHaveProperty("Countdown");
        expect(extensions.Renderer.Component).toHaveProperty("Dialog");
        expect(extensions.Renderer.Component).toHaveProperty("Drawer");
        expect(extensions.Renderer.Component).toHaveProperty("Dropdown");
        expect(extensions.Renderer.Component).toHaveProperty("EditableList");
        expect(extensions.Renderer.Component).toHaveProperty("EventDetails");
        expect(extensions.Renderer.Component).toHaveProperty("Events");
        expect(extensions.Renderer.Component).toHaveProperty("FilePicker");
        expect(extensions.Renderer.Component).toHaveProperty("Gutter");
        expect(extensions.Renderer.Component).toHaveProperty("HorizontalLine");
        expect(extensions.Renderer.Component).toHaveProperty("Input");
        expect(extensions.Renderer.Component).toHaveProperty("ItemListLayout");
        expect(extensions.Renderer.Component).toHaveProperty("KubeObjectAge");
        expect(extensions.Renderer.Component).toHaveProperty("KubeObjectDetails");
        expect(extensions.Renderer.Component).toHaveProperty("KubeObjectListLayout");
        expect(extensions.Renderer.Component).toHaveProperty("KubeObjectMenu");
        expect(extensions.Renderer.Component).toHaveProperty("KubeObjectMeta");
        expect(extensions.Renderer.Component).toHaveProperty("LineProgress");
        expect(extensions.Renderer.Component).toHaveProperty("List");
        expect(extensions.Renderer.Component).toHaveProperty("LocaleDate");
        expect(extensions.Renderer.Component).toHaveProperty("MainLayout");
        expect(extensions.Renderer.Component).toHaveProperty("Map");
        expect(extensions.Renderer.Component).toHaveProperty("MarkdownViewer");
        expect(extensions.Renderer.Component).toHaveProperty("MaybeLink");
        expect(extensions.Renderer.Component).toHaveProperty("Menu");
        expect(extensions.Renderer.Component).toHaveProperty("MonacoEditor");
        expect(extensions.Renderer.Component).toHaveProperty("NamespaceSelect");
        expect(extensions.Renderer.Component).toHaveProperty("NoItems");
        expect(extensions.Renderer.Component).toHaveProperty("PageLayout");
        expect(extensions.Renderer.Component).toHaveProperty("PathPicker");
        expect(extensions.Renderer.Component).toHaveProperty("PieChart");
        expect(extensions.Renderer.Component).toHaveProperty("PodCharts");
        expect(extensions.Renderer.Component).toHaveProperty("PodDetailsList");
        expect(extensions.Renderer.Component).toHaveProperty("Radio");
        expect(extensions.Renderer.Component).toHaveProperty("ReactiveDuration");
        expect(extensions.Renderer.Component).toHaveProperty("RenderDelay");
        expect(extensions.Renderer.Component).toHaveProperty("ResourceMetrics");
        expect(extensions.Renderer.Component).toHaveProperty("Select");
        expect(extensions.Renderer.Component).toHaveProperty("SettingLayout");
        expect(extensions.Renderer.Component).toHaveProperty("Slider");
        expect(extensions.Renderer.Component).toHaveProperty("StatusBrick");
        expect(extensions.Renderer.Component).toHaveProperty("Stepper");
        expect(extensions.Renderer.Component).toHaveProperty("SubTitle");
        expect(extensions.Renderer.Component).toHaveProperty("Switch");
        expect(extensions.Renderer.Component).toHaveProperty("TabLayout");
        expect(extensions.Renderer.Component).toHaveProperty("Table");
        expect(extensions.Renderer.Component).toHaveProperty("Tabs");
        expect(extensions.Renderer.Component).toHaveProperty("TreeView");
        expect(extensions.Renderer.Component).toHaveProperty("VirtualList");
        expect(extensions.Renderer.Component).toHaveProperty("WithTooltip");
        expect(extensions.Renderer.Component).toHaveProperty("Wizard");
        expect(extensions.Renderer.Component).toHaveProperty("WizardLayout");
      });
    });

    describe("Navigation namespace", () => {
      it("should export navigation helpers", () => {
        expect(extensions.Renderer.Navigation).toHaveProperty("navigate");
        expect(typeof extensions.Renderer.Navigation.navigate).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("getDetailsUrl");
        expect(typeof extensions.Renderer.Navigation.getDetailsUrl).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("showDetails");
        expect(typeof extensions.Renderer.Navigation.showDetails).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("hideDetails");
        expect(typeof extensions.Renderer.Navigation.hideDetails).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("createPageParam");
        expect(typeof extensions.Renderer.Navigation.createPageParam).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("isActiveRoute");
        expect(typeof extensions.Renderer.Navigation.isActiveRoute).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("showEntityDetails");
        expect(typeof extensions.Renderer.Navigation.showEntityDetails).toBe("function");
        expect(extensions.Renderer.Navigation).toHaveProperty("hideEntityDetails");
        expect(typeof extensions.Renderer.Navigation.hideEntityDetails).toBe("function");
      });
    });

    describe("Theme namespace", () => {
      it("should export activeTheme and getActiveTheme", () => {
        expect(extensions.Renderer.Theme).toHaveProperty("activeTheme");
        expect(extensions.Renderer.Theme).toHaveProperty("getActiveTheme");
        expect(typeof extensions.Renderer.Theme.getActiveTheme).toBe("function");
      });
    });
  });
});
