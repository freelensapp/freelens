import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import PodMenuItem from "../pod-menu-item";

import type { ContainerWithType } from "@freelensapp/kube-object/dist";

import type { DiContainer } from "@ogre-tools/injectable";

jest.mock("../../menu", () => {
  const actualMenu = jest.requireActual("../../menu");

  return {
    ...actualMenu,
    __esModule: true,
    MenuItem: ({ onClick, children }: { onClick: () => void; children?: React.ReactNode }) => (
      <div data-testid="menu-item-testid" onClick={onClick}>
        {children}
      </div>
    ),
  };
});

describe("pod-menu-item", () => {
  let di: DiContainer;
  let render: DiRender;
  let callback: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    callback = jest.fn();

    render = renderFor(di);
  });

  it("given null containers should render null component", () => {
    // WHEN
    const { container } = render(
      <PodMenuItem
        material="pageview"
        title="title"
        tooltip="tooltip"
        toolbar={true}
        containers={null as never}
        annotations={[]}
        statuses={[]}
        onMenuItemClick={() => {}}
      />,
    );

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it("given empty containers should render null component", () => {
    // WHEN
    const { container } = render(
      <PodMenuItem
        material="pageview"
        title="title"
        tooltip="tooltip"
        toolbar={true}
        containers={[]}
        annotations={[]}
        statuses={[]}
        onMenuItemClick={() => {}}
      />,
    );

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it("click on main MenuItem should execute onMenuItemClick", () => {
    // GIVEN
    const title = "title";
    const containers: ContainerWithType[] = [{ name: "container-name-1", type: "containers" }];

    // WHEN
    expect(() => {
      render(
        <PodMenuItem
          material="pageview"
          title={title}
          tooltip="tooltip"
          toolbar={true}
          containers={containers}
          annotations={[]}
          statuses={[]}
          onMenuItemClick={callback}
        />,
      );
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem).toHaveLength(2);

    fireEvent.click(menuItem[0]);
    expect(callback).toBeCalledWith(containers[0]);
  });

  it("given containers with more elements should render SubMenu", () => {
    // GIVEN
    const title = "title";
    const containers: ContainerWithType[] = [
      { name: "container-name-1", type: "containers" },
      { name: "container-name-2", type: "containers" },
      { name: "container-name-3", type: "containers" },
    ];
    const statuses = [
      { name: "container-name-1", state: { running: { startedAt: "" } } },
      { name: "container-name-2", state: { running: { startedAt: "" } }, ready: true },
      { name: "container-name-3", state: { terminated: { startedAt: "" } }, ready: true },
    ];

    // WHEN
    const { container } = render(
      <PodMenuItem
        material="pageview"
        title={title}
        tooltip="tooltip"
        toolbar={true}
        containers={containers}
        annotations={[]}
        // @ts-ignore
        statuses={statuses}
        onMenuItemClick={callback}
      />,
    );

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem).toHaveLength(4);
    expect(container.querySelector(".Icon")).toBeInTheDocument();
    const titleSpan = container.querySelector(".title");

    expect(titleSpan).toBeInTheDocument();
    expect(titleSpan).toHaveTextContent(title);
    const subMenu = container.querySelector(".SubMenu") as HTMLElement;

    expect(subMenu).not.toBeNull();
    const statusBricks = container.querySelectorAll(".StatusBrick");

    expect(statusBricks).toHaveLength(3);
    expect(statusBricks[0].classList.contains("waiting")).toBe(true);
    expect(statusBricks[1].classList.contains("running")).toBe(true);
    expect(statusBricks[2].classList.contains("terminated")).toBe(true);
    const menuItems = within(subMenu).getAllByTestId("menu-item-testid");

    expect(menuItems).toHaveLength(3);

    expect(menuItems).toHaveLength(3);
    expect(menuItems[0].querySelector("span")).toHaveTextContent("container-name-1");
    expect(menuItems[1].querySelector("span")).toHaveTextContent("container-name-2");
    expect(menuItems[2].querySelector("span")).toHaveTextContent("container-name-3");
  });

  it("click on first submenu should execute onMenuItemClick", () => {
    // GIVEN
    const title = "title";
    const containers: ContainerWithType[] = [
      { name: "container-name-1", type: "containers" },
      { name: "container-name-2", type: "containers" },
      { name: "container-name-3", type: "containers" },
    ];
    const statuses = [
      { name: "container-name-1", state: { running: { startedAt: "" } }, ready: true },
      { name: "container-name-2", state: { waiting: { startedAt: "" } }, ready: true },
      { name: "container-name-3", state: { terminated: { startedAt: "" } }, ready: true },
    ];

    // WHEN
    expect(() => {
      render(
        <PodMenuItem
          material="pageview"
          title={title}
          tooltip="tooltip"
          toolbar={true}
          containers={containers}
          annotations={[]}
          // @ts-ignore
          statuses={statuses}
          onMenuItemClick={callback}
        />,
      );
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    fireEvent.click(menuItem[1]);
    expect(callback).toBeCalledWith(containers[0]);
  });

  it("click on main MenuItem should execute onMenuItemClick with preferred container", () => {
    // GIVEN
    const title = "title";
    const containers: ContainerWithType[] = [
      { name: "container-name-1", type: "containers" },
      { name: "container-name-2", type: "containers" },
    ];
    const annotations: string[] = ["kubectl.kubernetes.io/default-container=container-name-2"];

    // WHEN
    expect(() => {
      render(
        <PodMenuItem
          material="pageview"
          title={title}
          tooltip="tooltip"
          toolbar={true}
          containers={containers}
          annotations={annotations}
          statuses={[]}
          onMenuItemClick={callback}
        />,
      );
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem).toHaveLength(3);

    fireEvent.click(menuItem[0]);
    expect(callback).toBeCalledWith(containers[1]);
  });
});
