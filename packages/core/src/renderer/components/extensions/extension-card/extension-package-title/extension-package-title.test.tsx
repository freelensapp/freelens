import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import openLinkInBrowserInjectable from "../../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { ExtensionPackageTitle } from "./extension-package-title";

import type { Mock } from "vitest";

describe("ExtensionPackageTitle", () => {
  let di: ReturnType<typeof getDiForUnitTesting>;
  let render: ReturnType<typeof renderFor>;
  let openLinkInBrowser: Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
    openLinkInBrowser = vi.fn();
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowser);
  });

  it("opens the repository link when the package name is clicked", () => {
    render(<ExtensionPackageTitle name="@scope/pkg" repository="https://github.com/foo/bar" />);

    fireEvent.click(screen.getByRole("button", { name: /pkg/i }));

    expect(openLinkInBrowser).toHaveBeenCalledWith("https://github.com/foo/bar");
  });

  it("does not render a clickable name when no repository is present", () => {
    render(<ExtensionPackageTitle name="@scope/pkg" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("pkg")).toBeInTheDocument();
  });
});
