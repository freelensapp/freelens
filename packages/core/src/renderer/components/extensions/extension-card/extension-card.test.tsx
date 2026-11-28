/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ExtensionCard } from "./extension-card";

import type { Mock } from "vitest";

import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { DiRender } from "../../test-utils/renderFor";
import type { MarketplaceExtension } from "../marketplace-extensions/marketplace-extensions.injectable";
import type { ExtensionCardProps } from "./extension-card";

const entry: MarketplaceExtension = {
  id: "my-extension",
  packageName: "@jane-doe/my-extension",
  displayName: "My Extension",
  summary: "Does one thing.",
  description: "Does **one** thing, well.",
  tier: "community",
  version: { version: "2.1.0", freelens: "^2.1.0" },
  homepage: "https://example.com/my-extension",
  repository: "https://github.com/jane-doe/freelens-my-extension",
  authors: [],
};

const installed = (manifest: Partial<InstalledExtension["manifest"]> & Record<string, unknown> = {}) =>
  ({
    id: "/extensions/my-extension/package.json",
    manifest: {
      name: "@jane-doe/my-extension",
      version: "2.0.0",
      engines: { freelens: "^2.0.0" },
      ...manifest,
    },
    absolutePath: "/extensions/my-extension",
    manifestPath: "/extensions/my-extension/package.json",
    isEnabled: true,
    isCompatible: true,
    isManaged: true,
    isVerified: true,
  }) as InstalledExtension;

describe("ExtensionCard", () => {
  let render: DiRender;
  let openLinkInBrowser: Mock;
  let onInstall: Mock;
  let onReinstall: Mock;

  const renderCard = (props: Partial<ExtensionCardProps>) =>
    render(
      <ExtensionCard
        onInstall={onInstall}
        onUpdate={vi.fn()}
        onReinstall={onReinstall}
        onUninstall={vi.fn()}
        onEnable={vi.fn()}
        onDisable={vi.fn()}
        {...props}
      />,
    );

  const details = () => screen.getByTestId("extension-details").closest("[data-collapsed], [id]");
  const isExpanded = () => !details()?.hasAttribute("data-collapsed");

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
    openLinkInBrowser = vi.fn();
    onInstall = vi.fn();
    onReinstall = vi.fn();
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowser);
  });

  it("starts collapsed, with the details out of the reach of the keyboard", () => {
    renderCard({ entry });

    expect(isExpanded()).toBe(false);
    expect(details()).toHaveAttribute("inert");
    expect(screen.getByTestId("extension-card-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  it("expands on a click on the card and collapses on the next one", () => {
    renderCard({ entry });

    fireEvent.click(screen.getByText("Does one thing."));

    expect(isExpanded()).toBe(true);
    expect(details()).not.toHaveAttribute("inert");
    expect(screen.getByTestId("extension-card-toggle")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByText("Does one thing."));

    expect(isExpanded()).toBe(false);
  });

  it("expands and collapses with its button, for the keyboard", () => {
    renderCard({ entry });

    const toggle = screen.getByTestId("extension-card-toggle");

    fireEvent.click(toggle);
    expect(isExpanded()).toBe(true);
    expect(toggle).toHaveAccessibleName("Hide details");
    expect(screen.getByTestId("extension-details").closest("[id]")).toHaveAttribute(
      "id",
      toggle.getAttribute("aria-controls"),
    );

    fireEvent.click(toggle);
    expect(isExpanded()).toBe(false);
  });

  it("leaves a click on its action button to the button", () => {
    renderCard({ entry });

    fireEvent.click(screen.getByRole("button", { name: "Install" }));

    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(isExpanded()).toBe(false);
  });

  it("does not expand when the click ends a selection of its text", () => {
    renderCard({ entry });
    vi.spyOn(globalThis, "getSelection").mockReturnValue({ toString: () => "one thing" } as Selection);

    fireEvent.click(screen.getByText("Does one thing."));

    expect(isExpanded()).toBe(false);
  });

  it("shows the description of a marketplace entry as Markdown, its links and the Freelens it needs", () => {
    renderCard({ entry, installed: installed() });

    const shown = screen.getByTestId("extension-details");

    expect(within(shown).getByText("one", { selector: "strong" })).toBeInTheDocument();
    expect(within(shown).getByTestId("extension-freelens-installed")).toHaveTextContent("^2.0.0 for v2.0.0 installed");
    expect(within(shown).getByTestId("extension-freelens-marketplace")).toHaveTextContent(
      "^2.1.0 for v2.1.0 in the marketplace",
    );

    fireEvent.click(within(shown).getByTestId("extension-homepage"));
    fireEvent.click(within(shown).getByTestId("extension-repository"));

    expect(openLinkInBrowser).toHaveBeenNthCalledWith(1, "https://example.com/my-extension");
    expect(openLinkInBrowser).toHaveBeenNthCalledWith(2, "https://github.com/jane-doe/freelens-my-extension");
  });

  it("separates the description from the links and versions", () => {
    renderCard({ entry });

    const shown = screen.getByTestId("extension-details");

    expect(within(shown).getByRole("separator")).toBeInTheDocument();
  });

  it("has nothing to separate when there is no description", () => {
    renderCard({ entry: { ...entry, description: undefined } });

    expect(within(screen.getByTestId("extension-details")).queryByRole("separator")).not.toBeInTheDocument();
  });

  it("offers Install in the menu of an extension that is not installed", () => {
    renderCard({ entry });

    fireEvent.click(screen.getByTestId("icon-for-extension-card-menu"));

    expect(isExpanded()).toBe(false);
    expect(screen.queryByText("Uninstall")).not.toBeInTheDocument();
    expect(screen.queryByText("Disable")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Install", { selector: ".title" }));

    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(isExpanded()).toBe(false);
  });

  it("offers Reinstall in the menu of an installed extension of the marketplace", () => {
    renderCard({ entry, installed: installed() });

    fireEvent.click(screen.getByTestId("icon-for-extension-card-menu"));
    fireEvent.click(screen.getByText("Reinstall", { selector: ".title" }));

    expect(onReinstall).toHaveBeenCalledTimes(1);
  });

  it("does not offer Reinstall for an extension that is not in the marketplace", () => {
    renderCard({ installed: installed() });

    fireEvent.click(screen.getByTestId("icon-for-extension-card-menu"));

    expect(screen.getByText("Uninstall", { selector: ".title" })).toBeInTheDocument();
    expect(screen.queryByText("Reinstall")).not.toBeInTheDocument();
  });

  it("does not offer Reinstall for an extension that is not installed", () => {
    renderCard({ entry });

    fireEvent.click(screen.getByTestId("icon-for-extension-card-menu"));

    expect(screen.queryByText("Reinstall")).not.toBeInTheDocument();
  });

  it("offers nothing in the menu while the extension is installed", () => {
    renderCard({ entry, isInstalling: true });

    fireEvent.click(screen.getByTestId("icon-for-extension-card-menu"));

    expect(screen.getByText("Install", { selector: ".title" })).toHaveAttribute("aria-disabled", "true");
  });

  it("does not repeat the summary when the entry has no description", () => {
    renderCard({ entry: { ...entry, description: undefined } });

    expect(screen.getAllByText("Does one thing.")).toHaveLength(1);
  });

  it("does not repeat a description of a package.json that the summary shows in full", () => {
    renderCard({ installed: installed({ description: "Short and sweet." }) });

    expect(screen.getAllByText("Short and sweet.")).toHaveLength(1);
  });

  it("shows an extension from outside the marketplace with the fields of its package.json", () => {
    renderCard({
      installed: installed({
        description: "A long description\nof two lines.",
        homepage: "https://example.org",
        repository: { type: "git", url: "git+https://github.com/jane-doe/freelens-my-extension.git" },
      }),
    });

    const shown = screen.getByTestId("extension-details");

    expect(within(shown).getByText(/A long description\s+of two lines\./)).toBeInTheDocument();
    expect(within(shown).getByTestId("extension-homepage")).toHaveTextContent("https://example.org");
    expect(within(shown).getByTestId("extension-repository")).toHaveTextContent(
      "https://github.com/jane-doe/freelens-my-extension",
    );
    expect(within(shown).queryByTestId("extension-freelens-marketplace")).not.toBeInTheDocument();
  });

  describe("the source", () => {
    const sourceOf = () => {
      const source = screen.getByTestId("extension-source");

      return [source.closest("dd")?.previousElementSibling?.textContent, source.textContent];
    };

    it("is the package and version the marketplace installs from npm", () => {
      renderCard({ entry });

      expect(sourceOf()).toEqual(["Package", "@jane-doe/my-extension@2.1.0"]);
    });

    it("is the URL of the tarball the marketplace installs from it", () => {
      const url = "https://github.com/jane-doe/freelens-my-extension/releases/download/v2.1.0/my-extension.tgz";

      renderCard({ entry: { ...entry, version: { ...entry.version, url, integrity: "sha256-a" } } });

      expect(sourceOf()).toEqual(["URL", url]);
    });

    it.each([
      [
        { kind: "registry", name: "@jane-doe/my-extension", version: "2.0.0" },
        "Package",
        "@jane-doe/my-extension@2.0.0",
      ],
      [{ kind: "url", url: "https://example.com/my-extension.tgz" }, "URL", "https://example.com/my-extension.tgz"],
      [{ kind: "file", path: "/tmp/my-extension.tgz" }, "File", "/tmp/my-extension.tgz"],
      [{ kind: "directory", path: "/src/my-extension" }, "Directory", "/src/my-extension"],
    ] as const)("of an installed extension is what its install recorded: %o", (installedSource, label, value) => {
      renderCard({ entry, installed: installed(), installedSource });

      expect(sourceOf()).toEqual([label, value]);
    });

    it("can be copied", async () => {
      const writeText = vi.fn(async () => {});

      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      renderCard({ entry, installed: installed(), installedSource: { kind: "directory", path: "/src/my-extension" } });

      fireEvent.click(screen.getByTestId("extension-source-copy"));

      expect(writeText).toHaveBeenCalledWith("/src/my-extension");
    });

    it("of an installed extension without a record is its package and version", () => {
      renderCard({ installed: installed() });

      expect(sourceOf()).toEqual(["Package", "@jane-doe/my-extension@2.0.0"]);
    });
  });

  it("leaves out links of a package.json that are not https", () => {
    renderCard({ installed: installed({ homepage: "javascript:alert(1)", repository: "github:jane-doe/repo" }) });

    const shown = screen.getByTestId("extension-details");

    expect(within(shown).queryByTestId("extension-homepage")).not.toBeInTheDocument();
    expect(within(shown).queryByTestId("extension-repository")).not.toBeInTheDocument();
  });
});
