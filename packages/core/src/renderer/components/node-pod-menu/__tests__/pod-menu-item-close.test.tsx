/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, screen } from "@testing-library/react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { Menu } from "../../menu";
import { renderFor } from "../../test-utils/renderFor";
import PodMenuItem from "../pod-menu-item";

import type { ContainerWithType } from "@freelensapp/kube-object";

import type { Mock } from "vitest";

describe("pod-menu-item inside a menu", () => {
  let close: Mock;
  let onMenuItemClick: Mock;

  const containers: ContainerWithType[] = [
    { name: "container-name-1", type: "containers" },
    { name: "container-name-2", type: "containers" },
  ];

  beforeEach(() => {
    const render = renderFor(getDiForUnitTesting());

    close = vi.fn();
    onMenuItemClick = vi.fn();

    render(
      <Menu isOpen open={() => {}} close={close} animated={false}>
        <PodMenuItem
          material="subject"
          title="Logs"
          tooltip="Pod Logs"
          toolbar={false}
          containers={containers}
          annotations={[]}
          statuses={[]}
          onMenuItemClick={onMenuItemClick}
        />
      </Menu>,
    );
  });

  describe("when a container of the sub-menu is clicked", () => {
    beforeEach(() => {
      fireEvent.click(screen.getByText("container-name-2"));
    });

    it("runs the action once, with that container", () => {
      expect(onMenuItemClick).toHaveBeenCalledTimes(1);
      expect(onMenuItemClick).toHaveBeenCalledWith(containers[1]);
    });

    it("closes the menu", () => {
      expect(close).toHaveBeenCalled();
    });
  });

  describe("when the item itself is clicked", () => {
    beforeEach(() => {
      fireEvent.click(screen.getByText("Logs"));
    });

    it("runs the action once, with the default container", () => {
      expect(onMenuItemClick).toHaveBeenCalledTimes(1);
      expect(onMenuItemClick).toHaveBeenCalledWith(containers[0]);
    });

    it("closes the menu", () => {
      expect(close).toHaveBeenCalled();
    });
  });
});
