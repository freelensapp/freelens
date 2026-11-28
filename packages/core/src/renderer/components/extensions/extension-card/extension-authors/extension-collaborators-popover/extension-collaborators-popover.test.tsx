import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import openLinkInBrowserInjectable from "../../../../../../common/utils/open-link-in-browser.injectable";
import { getDiForUnitTesting } from "../../../../../getDiForUnitTesting";
import { renderFor } from "../../../../test-utils/renderFor";
import { ExtensionCollaboratorsPopover } from "./extension-collaborators-popover";

import type { Mock } from "vitest";

import type { MarketplaceExtensionAuthor } from "../../../marketplace-extensions/marketplace-extensions.injectable";

const authors: MarketplaceExtensionAuthor[] = [
  { name: "Alice Adams" },
  { name: "Bob Brown" },
  { name: "Carol" },
  { name: "Dave Davis" },
];

describe("ExtensionCollaboratorsPopover", () => {
  let di: ReturnType<typeof getDiForUnitTesting>;
  let render: ReturnType<typeof renderFor>;
  let openLinkInBrowser: Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
    openLinkInBrowser = vi.fn();
    di.override(openLinkInBrowserInjectable, () => openLinkInBrowser);
  });

  it("renders all authors", () => {
    const onDismiss = vi.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.getByText("Dave Davis")).toBeInTheDocument();
  });

  it("calls onDismiss when Escape is pressed", () => {
    const onDismiss = vi.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when clicking outside the popover", () => {
    const onDismiss = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />
      </div>,
    );
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not call onDismiss when clicking inside the popover", () => {
    const onDismiss = vi.fn();
    render(<ExtensionCollaboratorsPopover authors={authors} onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText("Alice Adams"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("renders a github or a website icon for an author with a url only", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [
      { name: "Alice", url: "https://github.com/alice" },
      { name: "Bob", url: "https://bob.dev" },
      { name: "Carol" },
    ];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={vi.fn()} />);

    const popover = screen.getByTestId("collaborators-popover");
    expect(within(popover).getAllByRole("button", { name: /github/i })).toHaveLength(1);
    expect(within(popover).getAllByRole("button", { name: /website/i })).toHaveLength(1);
  });

  it("opens the github link when the github icon is clicked", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [{ name: "Alice", url: "https://github.com/alice" }];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /github/i }));

    expect(openLinkInBrowser).toHaveBeenCalledWith("https://github.com/alice");
  });

  it("opens the website link when the website icon is clicked", () => {
    const authorsWithLinks: MarketplaceExtensionAuthor[] = [{ name: "Alice", url: "https://alice.dev" }];
    render(<ExtensionCollaboratorsPopover authors={authorsWithLinks} onDismiss={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /website/i }));

    expect(openLinkInBrowser).toHaveBeenCalledWith("https://alice.dev");
  });
});
