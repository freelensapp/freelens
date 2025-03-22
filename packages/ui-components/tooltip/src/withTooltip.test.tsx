/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { StrictReactNode } from "@freelensapp/utilities";
import { render, RenderResult } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import React from "react";
import { withTooltip } from "./withTooltip";
import "@testing-library/jest-dom";

type MyComponentProps = {
  text: string;
  id?: string;
  children?: StrictReactNode;
  "data-testid"?: string;
};

const MyComponent = withTooltip(({ text, "data-testid": testId, id, children }: MyComponentProps) => (
  <div id={id} data-testid={testId}>
    {text}
    {children}
  </div>
));

describe("withTooltip tests", () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it("does not render a tooltip when not specified", () => {
    const result = render(<MyComponent text="foobar" />);

    expect(result.baseElement).toMatchSnapshot();
  });

  it("renders a tooltip when specified without id", () => {
    const result = render(<MyComponent text="foobar" tooltip="my-tooltip" />);

    expect(result.baseElement).toMatchSnapshot();
  });

  describe("when a tooltip ReactNode and id is specified", () => {
    let result: RenderResult;

    beforeEach(() => {
      result = render(<MyComponent text="foobar" data-testid="my-test-id" tooltip="my-tooltip" id="bat" />);
    });

    it("renders", () => {
      expect(result.baseElement).toMatchSnapshot();
    });

    describe("when hovering the component", () => {
      beforeEach(async () => {
        await user.hover(result.getByTestId("my-test-id"));
      });

      it("renders", () => {
        expect(result.baseElement).toMatchSnapshot();
      });

      it("shows the tooltip", () => {
        expect(result.getByText("my-tooltip")).toBeInTheDocument();
      });
    });
  });

  describe("when a tooltip via props and id is specified", () => {
    let result: RenderResult;

    beforeEach(() => {
      result = render(
        <MyComponent text="foobar" data-testid="my-test-id" tooltip={{ children: "my-tooltip" }} id="bat" />,
      );
    });

    it("renders", () => {
      expect(result.baseElement).toMatchSnapshot();
    });

    describe("when hovering the component", () => {
      beforeEach(async () => {
        await user.hover(result.getByTestId("my-test-id"));
      });

      it("renders", () => {
        expect(result.baseElement).toMatchSnapshot();
      });

      it("shows the tooltip", () => {
        expect(result.getByText("my-tooltip")).toBeInTheDocument();
      });
    });
  });
});
