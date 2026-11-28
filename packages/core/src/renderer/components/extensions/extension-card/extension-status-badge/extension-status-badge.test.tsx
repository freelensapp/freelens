import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { ExtensionStatusBadge } from "./extension-status-badge";

describe("ExtensionStatusBadge", () => {
  it("renders the logo of Freelens for the official variant, not the verified icon", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    render(<ExtensionStatusBadge variant="official" />);
    expect(screen.getByTestId("extension-tier-official")).toHaveClass("svg");
    expect(screen.queryByText("verified")).not.toBeInTheDocument();
  });

  it("explains in a tooltip what the official variant means", async () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    render(<ExtensionStatusBadge variant="official" />);
    fireEvent.mouseEnter(screen.getByTestId("extension-tier-official"));

    expect(await screen.findByText("Official: an extension of the Freelens organization")).toBeInTheDocument();
  });

  it("renders nothing for the community variant", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    const { container } = render(<ExtensionStatusBadge variant="community" />);
    expect(container).toBeEmptyDOMElement();
  });
});
