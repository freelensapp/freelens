import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { ExtensionStatusBadge } from "./extension-status-badge";

describe("ExtensionStatusBadge", () => {
  it("renders the verified icon for the official variant", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    render(<ExtensionStatusBadge variant="official" />);
    expect(screen.getByText("verified")).toBeInTheDocument();
  });

  it("renders nothing for the community variant", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    const { container } = render(<ExtensionStatusBadge variant="community" />);
    expect(container).toBeEmptyDOMElement();
  });
});
