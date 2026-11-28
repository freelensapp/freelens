/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MockedFunction } from "vitest";

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { observable, when } from "mobx";
import directoryForDownloadsInjectable from "../../../../common/app-paths/directory-for-downloads/directory-for-downloads.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import extensionDiscoveryInjectable from "../../../../extensions/extension-discovery/extension-discovery.injectable";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import { ConfirmDialog } from "../../confirm-dialog";
import { renderFor } from "../../test-utils/renderFor";
import { Extensions } from "../extensions";
import installExtensionFromInputInjectable from "../install-extension-from-input.injectable";
import requestMarketplaceExtensionsInjectable from "../marketplace-extensions/request-marketplace-extensions.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { RemovePath } from "../../../../common/fs/remove.injectable";
import type { ExtensionDiscovery } from "../../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { DownloadBinary } from "../../../../main/fetch/download-binary.injectable";
import type { DiRender } from "../../test-utils/renderFor";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";

const marketplaceMockExtension = (overrides?: Partial<MarketplaceExtension>): MarketplaceExtension => ({
  id: "test",
  packageName: "test",
  displayName: "Test",
  summary: "Test marketplace extension",
  tier: "official",
  version: { version: "2.0.0", freelens: "^2.0.0" },
  authors: [],
  ...overrides,
});

describe("Extensions", () => {
  let extensionLoader: ExtensionLoader;
  let extensionDiscovery: ExtensionDiscovery;
  let installExtensionFromInput: MockedFunction<InstallExtensionFromInput>;
  let extensionInstallationStateStore: ExtensionInstallationStateStore;
  let render: DiRender;
  let deleteFileMock: MockedFunction<RemovePath>;
  let downloadBinary: MockedFunction<DownloadBinary>;
  let di: DiContainer;
  let marketplaceExtensions: MarketplaceExtension[];

  beforeEach(() => {
    try {
      localStorage.clear();

      di = getDiForUnitTesting();

      di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
      di.override(directoryForDownloadsInjectable, () => "some-directory-for-downloads");
      di.override(currentlyInClusterFrameInjectable, () => false);

      render = renderFor(di);

      installExtensionFromInput = vi.fn();
      di.override(installExtensionFromInputInjectable, () => installExtensionFromInput);

      marketplaceExtensions = [marketplaceMockExtension()];
      di.override(requestMarketplaceExtensionsInjectable, () => async () => marketplaceExtensions);

      deleteFileMock = vi.fn();
      di.override(removePathInjectable, () => deleteFileMock);

      downloadBinary = vi.fn().mockImplementation((url) => {
        throw new Error(`Unexpected call to downloadJson for url=${url}`);
      });

      extensionLoader = di.inject(extensionLoaderInjectable);
      extensionDiscovery = di.inject(extensionDiscoveryInjectable);
      extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);

      extensionLoader.addExtension({
        id: "extensionId",
        manifest: {
          name: "test",
          version: "1.2.3",
          engines: { freelens: "^0.1.0" },
        },
        absolutePath: "/absolute/path",
        manifestPath: "/absolute/path/package.json",
        isEnabled: true,
        isCompatible: true,
        isManaged: true,
        isVerified: true,
      });

      extensionDiscovery.uninstallExtension = vi.fn(() => Promise.resolve());
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  const findInstalledCard = () => screen.findByTestId("installed-extension-card");
  const openMenuOfInstalledCard = async () =>
    fireEvent.click(within(await findInstalledCard()).getByTestId("icon-for-extension-card-menu"));

  it("disables the uninstall menu item while uninstalling", async () => {
    extensionDiscovery.isLoaded = true;

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    await openMenuOfInstalledCard();
    fireEvent.click(await screen.findByText("Uninstall"));
    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(() => {
      expect(extensionDiscovery.uninstallExtension).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText("Uninstall")).not.toBeInTheDocument();
    });

    await openMenuOfInstalledCard();

    expect(await screen.findByText("Uninstall")).toHaveAttribute("aria-disabled", "true");
  });

  it("disables install button while installing", async () => {
    render(<Extensions />);

    const resolveInstall = observable.box(false);
    const url = "https://test.extensionurl/package.tgz";

    deleteFileMock.mockReturnValue(Promise.resolve());
    installExtensionFromInput.mockImplementation(async (input) => {
      expect(input).toBe("https://test.extensionurl/package.tgz");

      const clear = extensionInstallationStateStore.startPreInstall();

      await when(() => resolveInstall.get());
      clear();
    });

    fireEvent.change(
      await screen.findByPlaceholderText("URL, or path to a package or directory", {
        exact: false,
      }),
      {
        target: {
          value: url,
        },
      },
    );

    const doResolve = observable.box(false);

    downloadBinary.mockImplementation(async (targetUrl) => {
      expect(targetUrl).toBe(url);

      await when(() => doResolve.get());

      return {
        callWasSuccessful: false,
        error: "unknown location",
      };
    });

    fireEvent.click(await screen.findByText("Install"));
    expect((await screen.findByText("Install")).closest("button")).toBeDisabled();
    doResolve.set(true);
  });

  it.each([
    ["from npm as <package>@<version>", { version: "2.0.0", freelens: "^2.0.0" }, ["@jane-doe/my-extension@2.0.0"]],
    [
      "from its url, with its integrity",
      {
        version: "2.0.0",
        freelens: "^2.0.0",
        url: "https://example.com/my-extension-2.0.0.tgz",
        integrity: "sha256-abc=",
      },
      ["https://example.com/my-extension-2.0.0.tgz", { integrity: "sha256-abc=" }],
    ],
  ])("installs a marketplace entry %s", async (_, version, expected) => {
    extensionDiscovery.isLoaded = true;
    marketplaceExtensions = [marketplaceMockExtension({ packageName: "@jane-doe/my-extension", version })];
    installExtensionFromInput.mockResolvedValue();

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Marketplace" }));

    const card = await screen.findByTestId("marketplace-extension-card");

    fireEvent.click(within(card).getByRole("button", { name: "Install" }));

    const dialog = await screen.findByTestId("confirmation-dialog");

    expect(dialog).toHaveTextContent("Are you sure you want to install @jane-doe/my-extension@2.0.0?");
    expect(installExtensionFromInput).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByTestId("confirm"));

    await waitFor(() => expect(installExtensionFromInput).toHaveBeenCalledWith(...expected));
  });

  it("installs nothing from the marketplace when the install is cancelled", async () => {
    extensionDiscovery.isLoaded = true;
    marketplaceExtensions = [marketplaceMockExtension({ packageName: "@jane-doe/my-extension" })];

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Marketplace" }));

    const card = await screen.findByTestId("marketplace-extension-card");

    fireEvent.click(within(card).getByRole("button", { name: "Install" }));
    fireEvent.click(within(await screen.findByTestId("confirmation-dialog")).getByText("Cancel"));

    await waitFor(() => expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument());
    expect(installExtensionFromInput).not.toHaveBeenCalled();
    expect(within(card).getByRole("button", { name: "Install" })).toBeEnabled();
  });

  it("keeps one card of the marketplace expanded at a time", async () => {
    extensionDiscovery.isLoaded = true;
    marketplaceExtensions = [
      marketplaceMockExtension({ id: "first", packageName: "first", displayName: "First" }),
      marketplaceMockExtension({ id: "second", packageName: "second", displayName: "Second" }),
    ];

    render(<Extensions />);

    fireEvent.click(await screen.findByRole("button", { name: "Marketplace" }));

    const toggleOf = async (name: string) =>
      within(await screen.findByRole("region", { name })).getByTestId("extension-card-toggle");

    fireEvent.click(await toggleOf("First"));
    expect(await toggleOf("First")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(await toggleOf("Second"));
    expect(await toggleOf("Second")).toHaveAttribute("aria-expanded", "true");
    expect(await toggleOf("First")).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(await toggleOf("Second"));
    expect(await toggleOf("Second")).toHaveAttribute("aria-expanded", "false");
  });

  it("downloads the marketplace again on a refresh, and keeps its cards until the new list is in", async () => {
    extensionDiscovery.isLoaded = true;

    const requests: Array<(extensions: MarketplaceExtension[]) => void> = [];

    di.override(
      requestMarketplaceExtensionsInjectable,
      () => () => new Promise<MarketplaceExtension[]>((resolve) => requests.push(resolve)),
    );
    render(<Extensions />);

    fireEvent.click(await screen.findByRole("button", { name: "Marketplace" }));
    act(() => requests[0]([marketplaceMockExtension({ packageName: "first", displayName: "First" })]));
    expect(await screen.findByText("First")).toBeInTheDocument();

    const refresh = screen.getByTestId("marketplace-refresh");

    fireEvent.click(refresh);

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(refresh).toHaveClass("disabled");

    act(() => requests[1]([marketplaceMockExtension({ packageName: "second", displayName: "Second" })]));

    expect(await screen.findByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByTestId("marketplace-refresh")).not.toHaveClass("disabled");
  });

  it("displays spinner while extensions are loading", () => {
    extensionDiscovery.isLoaded = false;
    const { container } = render(<Extensions />);

    expect(container.querySelector(".Spinner")).toBeInTheDocument();
  });

  it("does not display the spinner while extensions are not loading", async () => {
    extensionDiscovery.isLoaded = true;
    const { container } = render(<Extensions />);

    expect(container.querySelector(".Spinner")).not.toBeInTheDocument();
  });

  describe("the installed extension cards", () => {
    const testExtension = {
      id: "extensionId",
      manifest: { name: "test", version: "1.2.3", engines: { freelens: "^0.1.0" } },
      absolutePath: "/absolute/path",
      manifestPath: "/absolute/path/package.json",
      isEnabled: true,
      isCompatible: true,
      isManaged: true,
      isVerified: true,
    };

    const statusOf = async () => within(await findInstalledCard()).queryByTestId("extension-status");

    beforeEach(() => {
      extensionDiscovery.isLoaded = true;
    });

    it("shows Enabled for an enabled extension which loaded", async () => {
      render(<Extensions />);

      expect(await findInstalledCard()).toContainElement(document.querySelector('[data-status="enabled"]'));
      expect(await statusOf()).toHaveTextContent("Enabled");
      expect(await statusOf()).not.toHaveAttribute("title");
    });

    it("shows Disabled for a disabled extension", async () => {
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      expect(await statusOf()).toHaveTextContent("Disabled");
    });

    it("shows Incompatible for an extension built for another version", async () => {
      extensionLoader.addExtension({ ...testExtension, isCompatible: false });
      render(<Extensions />);

      expect(await statusOf()).toHaveTextContent("Incompatible");
    });

    it("shows Failed to load for an enabled extension which failed, with where and why in the tooltip", async () => {
      vi.spyOn(extensionLoader, "getLoadFailures").mockReturnValue([
        { process: "main", stage: "activate", message: "no activating today" },
        { process: "renderer", stage: "import", message: "Failed to fetch dynamically imported module" },
      ]);
      render(<Extensions />);

      const status = await statusOf();

      expect(status).toHaveTextContent("Failed to load");
      expect(status).toHaveAttribute(
        "title",
        "Failed in the main process while running onActivate: no activating today\n" +
          "Failed in the renderer process while importing its entry point: Failed to fetch dynamically imported module",
      );
    });

    it("keeps Disable and Uninstall available for an extension which failed to load", async () => {
      vi.spyOn(extensionLoader, "getLoadFailures").mockReturnValue([
        { process: "renderer", stage: "import", message: "missing" },
      ]);
      render(<Extensions />);

      await openMenuOfInstalledCard();

      expect(await screen.findByText("Disable")).toHaveAttribute("aria-disabled", "false");
      expect(await screen.findByText("Uninstall")).toHaveAttribute("aria-disabled", "false");
    });

    it("offers Enable in the menu of a disabled extension", async () => {
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      await openMenuOfInstalledCard();

      expect(await screen.findByText("Enable")).toHaveAttribute("aria-disabled", "false");
    });

    it("does not offer Enable for an incompatible extension", async () => {
      extensionLoader.addExtension({ ...testExtension, isEnabled: false, isCompatible: false });
      render(<Extensions />);

      await openMenuOfInstalledCard();

      expect(await screen.findByText("Uninstall")).toBeInTheDocument();
      expect(screen.queryByText("Enable")).not.toBeInTheDocument();
    });

    it("shows Disabled, not Failed to load, once a failed extension is disabled", async () => {
      vi.spyOn(extensionLoader, "getLoadFailures").mockReturnValue([
        { process: "main", stage: "import", message: "missing" },
      ]);
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      expect(await statusOf()).toHaveTextContent("Disabled");
    });

    it("shows whether the checksum of the installed build was verified", async () => {
      extensionLoader.addExtension({ ...testExtension, isVerified: false });
      render(<Extensions />);

      const provenance = within(await findInstalledCard()).getByTestId("extension-provenance");

      expect(provenance).toHaveAttribute("data-provenance", "unverified");

      fireEvent.mouseEnter(provenance);

      expect(
        await screen.findByText("Unverified: no checksum was available when it was installed"),
      ).toBeInTheDocument();
    });

    it("marks a build whose checksum was verified with the verified icon", async () => {
      render(<Extensions />);

      const provenance = within(await findInstalledCard()).getByTestId("extension-provenance");

      expect(provenance).toHaveAttribute("data-provenance", "verified");
      expect(provenance).toHaveTextContent("verified");
    });

    it("shows an extension of the marketplace with its entry and offers its newer version", async () => {
      render(<Extensions />);

      const card = await findInstalledCard();

      expect(within(card).getByText("Test")).toBeInTheDocument();
      expect(within(card).getByText("Test marketplace extension")).toBeInTheDocument();
      expect(within(card).getByText("v1.2.3")).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "Update" })).toBeInTheDocument();
    });

    it("reinstalls an extension of the marketplace from the marketplace", async () => {
      installExtensionFromInput.mockResolvedValue();
      render(<Extensions />);

      await openMenuOfInstalledCard();
      fireEvent.click(await screen.findByText("Reinstall"));

      expect(installExtensionFromInput).toHaveBeenCalledWith("test@2.0.0");
    });

    it("shows an extension installed from outside the marketplace from its manifest", async () => {
      marketplaceExtensions = [];
      extensionLoader.addExtension({
        ...testExtension,
        manifest: { ...testExtension.manifest, description: "From a tarball" },
      });
      render(<Extensions />);

      const card = await findInstalledCard();

      expect(within(card).getByText("test")).toBeInTheDocument();
      expect(within(card).getByText("From a tarball")).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: "Uninstall" })).toBeInTheDocument();
    });

    it("cuts the description of an extension from outside the marketplace to one line of a summary", async () => {
      marketplaceExtensions = [];
      extensionLoader.addExtension({
        ...testExtension,
        manifest: { ...testExtension.manifest, description: `First line\n${"x".repeat(200)}` },
      });
      render(<Extensions />);

      const summary = within(await findInstalledCard()).getByText(/^First line x+…$/);

      expect(summary.textContent).toHaveLength(160);
    });

    it("finds an installed extension by its status", async () => {
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      fireEvent.change(await screen.findByPlaceholderText("Search Extensions..."), { target: { value: "disab" } });
      expect(await findInstalledCard()).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText("Search Extensions..."), { target: { value: "enabled" } });
      expect(await screen.findByText("No data found")).toBeInTheDocument();
    });
  });
});
