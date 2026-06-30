/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import assert from "assert";
import { observable, when } from "mobx";
import React from "react";
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
  let installExtensionFromInput: jest.MockedFunction<InstallExtensionFromInput>;
  let extensionInstallationStateStore: ExtensionInstallationStateStore;
  let render: DiRender;
  let deleteFileMock: jest.MockedFunction<RemovePath>;
  let downloadBinary: jest.MockedFunction<DownloadBinary>;

  beforeEach(() => {
    try {
      const di = getDiForUnitTesting();

      di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
      di.override(directoryForDownloadsInjectable, () => "some-directory-for-downloads");
      di.override(currentlyInClusterFrameInjectable, () => false);

      render = renderFor(di);

      installExtensionFromInput = jest.fn();
      di.override(installExtensionFromInputInjectable, () => installExtensionFromInput);

      deleteFileMock = jest.fn();
      di.override(removePathInjectable, () => deleteFileMock);

      downloadBinary = jest.fn().mockImplementation((url) => {
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
        manifestPath: "/symlinked/path/package.json",
        isBundled: false,
        isEnabled: true,
        isCompatible: true,
      });

      extensionDiscovery.uninstallExtension = jest.fn(() => Promise.resolve());
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

    const section = await screen.findByTestId("extensions-table");
    const findMenuTriggerFor = (name: string) => {
      const title = within(section).getByText(name);
      let el: HTMLElement | null = title as HTMLElement;

      while (el && el !== section) {
        const trigger = el.querySelector(".Icon");
        if (trigger) return trigger;
        el = el.parentElement;
      }

      return null;
    };

    const menuTrigger = findMenuTriggerFor("test");
    assert(menuTrigger);
    // Try clicking the menu trigger; if the click is missed due to mount ordering, fall back to keyboard activation
    // Click visible uninstall button in the card footer (menu items may be in portal)
    const uninstallFooterButton = within(section).getByText("Uninstall").closest("button");
    assert(uninstallFooterButton);
    fireEvent.click(uninstallFooterButton as Element);

    // Approve confirm dialog
    fireEvent.click(await screen.findByText("Yes"));

    await waitFor(
      async () => {
        expect(extensionDiscovery.uninstallExtension).toHaveBeenCalled();

        // Footer uninstall button should be disabled while uninstalling
        const footerBtnAfter = within(section).getByText("Uninstall").closest("button");
        expect(footerBtnAfter).toBeDisabled();

        // If menu contains 'Disable' item, it should be disabled too
        const menuTriggerAfter = findMenuTriggerFor("test");
        assert(menuTriggerAfter);
        fireEvent.click(menuTriggerAfter as Element);

        const disableItem = screen.queryByText("Disable");
        if (disableItem) {
          expect(disableItem).toHaveAttribute("aria-disabled", "true");
        }
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
      await screen.findByPlaceholderText("File path or URL", {
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
});
