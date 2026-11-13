/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, test } from "vitest";
import "@testing-library/jest-dom/vitest";

import { Icon } from "@freelensapp/icon";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { Avatar } from "../avatar";

describe("<Avatar/>", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  test("renders w/o errors", () => {
    const { container } = render(<Avatar title="John Ferguson" />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  test("shows capital letters from title", () => {
    const { getByText } = render(<Avatar title="John Ferguson" />);

    expect(getByText("JF")).toBeInTheDocument();
  });

  test("shows the short name instead of the initials of the title", () => {
    const { getByText, queryByText } = render(<Avatar title="us-west-2-non-prod" shortName="W2NP" />);

    expect(getByText("W2NP")).toBeInTheDocument();
    expect(queryByText("UW2")).not.toBeInTheDocument();
  });

  test("shows custom icon passed as children", () => {
    const { getByTestId } = render(
      <Avatar title="John Ferguson">
        <Icon material="alarm" data-testid="alarm-icon" />
      </Avatar>,
    );

    expect(getByTestId("alarm-icon")).toBeInTheDocument();
  });

  test("shows <img/> element if src prop passed", () => {
    const { getByAltText } = render(<Avatar title="John Ferguson" src="someurl" />);

    expect(getByAltText("John Ferguson")).toBeInTheDocument();
  });
});
