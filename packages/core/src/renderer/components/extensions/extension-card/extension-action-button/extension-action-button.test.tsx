import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExtensionActionButton } from "./extension-action-button";

describe("ExtensionActionButton", () => {
  it("renders Install label for install state", () => {
    render(<ExtensionActionButton state="install" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
  });

  it("renders Uninstall label for uninstall state", () => {
    render(<ExtensionActionButton state="uninstall" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Uninstall" })).toBeInTheDocument();
  });

  it("draws Install as the primary button and Uninstall as the accent one", () => {
    const { rerender } = render(<ExtensionActionButton state="install" onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("primary");

    rerender(<ExtensionActionButton state="uninstall" onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("accent");
    expect(screen.getByRole("button")).not.toHaveClass("primary");
  });

  it("renders disabled with spinner for installing state", () => {
    render(<ExtensionActionButton state="installing" onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector(".Spinner")).toBeInTheDocument();
  });

  it("renders Update label for update state", () => {
    render(<ExtensionActionButton state="update" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("renders disabled with spinner for updating state", () => {
    render(<ExtensionActionButton state="updating" onClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector(".Spinner")).toBeInTheDocument();
  });

  it("invokes onClick when not disabled", () => {
    const onClick = vi.fn();
    render(<ExtensionActionButton state="install" onClick={onClick} />);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
