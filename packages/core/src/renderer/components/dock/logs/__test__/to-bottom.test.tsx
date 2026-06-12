/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import "@testing-library/jest-dom";

import { noop } from "@freelensapp/utilities";
import { fireEvent } from "@testing-library/react";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import { renderFor } from "../../../test-utils/renderFor";
import { ToBottom } from "../to-bottom";

import type { DiRender } from "../../../test-utils/renderFor";

describe("<ToBottom/>", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);
  });

  it("renders w/o errors", () => {
    const { container } = render(<ToBottom onClick={noop} />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("has 'To bottom' label", () => {
    const { getByText } = render(<ToBottom onClick={noop} />);

    expect(getByText("To bottom")).toBeInTheDocument();
  });

  it("has a arrow down icon", () => {
    const { getByText } = render(<ToBottom onClick={noop} />);

    expect(getByText("expand_more")).toBeInTheDocument();
  });

  it("fires an onclick event", () => {
    const callback = jest.fn();
    const { getByText } = render(<ToBottom onClick={callback} />);

    fireEvent.click(getByText("To bottom"));
    expect(callback).toBeCalled();
  });
});
