/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { EditableList } from "../editable-list";
import { Input } from "../input";
import { renderFor } from "../test-utils/renderFor";
import { Wizard, WizardStep } from "./wizard";

import type { RenderResult } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { Mock } from "vitest";

// the wizard step submit is debounced by 100ms: give it time to (not) fire
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));

describe("WizardStep submit on Enter", () => {
  let next: Mock;
  let addItem: Mock;
  let user: UserEvent;
  let result: RenderResult;

  beforeEach(() => {
    next = vi.fn();
    addItem = vi.fn();
    user = userEvent.setup();

    const render = renderFor(getDiForUnitTesting());

    result = render(
      <Wizard>
        <WizardStep next={next}>
          <Input placeholder="some plain field" />
          <EditableList placeholder="some list field" add={addItem} items={[]} remove={vi.fn()} />
        </WizardStep>
      </Wizard>,
    );
  });

  it("submits the step when Enter is pressed in a plain field", async () => {
    await user.type(result.getByPlaceholderText("some plain field"), "some value{Enter}");
    await settle();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("adds the item instead of submitting the step when Enter is pressed in a list field with a value", async () => {
    await user.type(result.getByPlaceholderText("some list field"), "some item{Enter}");
    await settle();

    expect(addItem).toHaveBeenCalledWith("some item");
    expect(next).not.toHaveBeenCalled();
  });

  it("still submits the step when Enter is pressed in an empty list field", async () => {
    await user.type(result.getByPlaceholderText("some list field"), "{Enter}");
    await settle();

    expect(addItem).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
