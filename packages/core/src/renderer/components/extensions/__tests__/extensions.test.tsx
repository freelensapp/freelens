/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MockedFunction } from "vitest";

import "@testing-library/jest-dom/vitest";
import assert from "node:assert";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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

import type { RemovePath } from "../../../../common/fs/remove.injectable";
import type { ExtensionDiscovery } from "../../../../extensions/extension-discovery/extension-discovery";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { DownloadBinary } from "../../../../main/fetch/download-binary.injectable";
import type { DiRender } from "../../test-utils/renderFor";
import type { InstallExtensionFromInput } from "../install-extension-from-input.injectable";

describe("Extensions", () => {
  let extensionLoader: ExtensionLoader;
  let extensionDiscovery: ExtensionDiscovery;
  let installExtensionFromInput: MockedFunction<InstallExtensionFromInput>;
  let extensionInstallationStateStore: ExtensionInstallationStateStore;
  let render: DiRender;
  let deleteFileMock: MockedFunction<RemovePath>;
  let downloadBinary: MockedFunction<DownloadBinary>;

  beforeEach(() => {
    try {
      const di = getDiForUnitTesting();

      di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
      di.override(directoryForDownloadsInjectable, () => "some-directory-for-downloads");
      di.override(currentlyInClusterFrameInjectable, () => false);

      render = renderFor(di);

      installExtensionFromInput = vi.fn();
      di.override(installExtensionFromInputInjectable, () => installExtensionFromInput);

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

  it("disables uninstall and disable buttons while uninstalling", async () => {
    extensionDiscovery.isLoaded = true;

    render(
      <>
        <Extensions />
        <ConfirmDialog />
      </>,
    );

    const table = await screen.findByTestId("extensions-table");
    const menuTrigger = table.querySelector("tbody tr td:last-child .Icon");

    assert(menuTrigger);
    fireEvent.click(menuTrigger);

    expect(await screen.findByText("Disable")).toHaveAttribute("aria-disabled", "false");
    expect(await screen.findByText("Uninstall")).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(await screen.findByText("Uninstall"));

    // Approve confirm dialog
    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(
      async () => {
        expect(extensionDiscovery.uninstallExtension).toHaveBeenCalled();
        fireEvent.click(menuTrigger);
        expect(screen.getByText("Disable")).toHaveAttribute("aria-disabled", "true");
        expect(screen.getByText("Uninstall")).toHaveAttribute("aria-disabled", "true");
      },
      {
        timeout: 30000,
      },
    );
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

  describe("the status column", () => {
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

    const statusCell = async () => {
      const table = await screen.findByTestId("extensions-table");
      const cell = table.querySelector("tbody tr td:nth-child(3) > div");

      assert(cell);

      return cell;
    };

    beforeEach(() => {
      extensionDiscovery.isLoaded = true;
    });

    it("shows Enabled for an enabled extension which loaded", async () => {
      render(<Extensions />);

      const cell = await statusCell();

      expect(cell).toHaveTextContent("Enabled");
      expect(cell).not.toHaveAttribute("title");
    });

    it("shows Disabled for a disabled extension", async () => {
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      expect(await statusCell()).toHaveTextContent("Disabled");
    });

    it("shows Incompatible for an extension built for another version", async () => {
      extensionLoader.addExtension({ ...testExtension, isCompatible: false });
      render(<Extensions />);

      expect(await statusCell()).toHaveTextContent("Incompatible");
    });

    it("shows Failed to load for an enabled extension which failed, with where and why in the tooltip", async () => {
      vi.spyOn(extensionLoader, "getLoadFailures").mockReturnValue([
        { process: "main", stage: "activate", message: "no activating today" },
        { process: "renderer", stage: "import", message: "Failed to fetch dynamically imported module" },
      ]);
      render(<Extensions />);

      const cell = await statusCell();

      expect(cell).toHaveTextContent("Failed to load");
      expect(cell).toHaveAttribute(
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

      const table = await screen.findByTestId("extensions-table");
      const menuTrigger = table.querySelector("tbody tr td:last-child .Icon");

      assert(menuTrigger);
      fireEvent.click(menuTrigger);

      expect(await screen.findByText("Disable")).toHaveAttribute("aria-disabled", "false");
      expect(await screen.findByText("Uninstall")).toHaveAttribute("aria-disabled", "false");
    });

    it("shows Disabled, not Failed to load, once a failed extension is disabled", async () => {
      vi.spyOn(extensionLoader, "getLoadFailures").mockReturnValue([
        { process: "main", stage: "import", message: "missing" },
      ]);
      extensionLoader.addExtension({ ...testExtension, isEnabled: false });
      render(<Extensions />);

      expect(await statusCell()).toHaveTextContent("Disabled");
    });
  });
});
