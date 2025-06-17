import { fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import openConfirmDialogInjectable from "../../confirm-dialog/open.injectable";
import createTerminalTabInjectable from "../../dock/terminal/create-terminal-tab.injectable";
import sendCommandInjectable from "../../dock/terminal/send-command.injectable";
import hideDetailsInjectable from "../../kube-detail-params/hide-details.injectable";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { NodeMenu } from "../node-menu";

import type { DiContainer } from "@ogre-tools/injectable";

jest.mock("../../menu", () => ({
  __esModule: true,
  MenuItem: ({ onClick, children }: { onClick: () => void; children?: React.ReactNode }) => (
    <div data-testid="menu-item-testid" onClick={onClick}>
      {children}
    </div>
  ),
}));

describe("pod-node-menu", () => {
  let di: DiContainer;
  let render: DiRender;
  let createTerminalTabMock: jest.Mock;
  let openConfirmDialogMock: jest.Mock;
  let sendCommandMock: jest.Mock;
  let hideDetailsMock: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    createTerminalTabMock = jest.fn();
    openConfirmDialogMock = jest.fn((params) => params.ok());
    sendCommandMock = jest.fn(() => Promise.resolve());
    hideDetailsMock = jest.fn();

    di.override(createTerminalTabInjectable, () => createTerminalTabMock);
    di.override(openConfirmDialogInjectable, () => openConfirmDialogMock);
    di.override(sendCommandInjectable, () => sendCommandMock);
    di.override(hideDetailsInjectable, () => hideDetailsMock);

    render = renderFor(di);
  });

  it("given null object should render null component", () => {
    // WHEN
    const { container } = render(<NodeMenu object={null as never} toolbar={false} />);

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it("given object without metadata should render null component", () => {
    // WHEN
    const { container } = render(<NodeMenu object={{}} toolbar={false} />);

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it("given non well formed object should render null component", () => {
    // GIVEN
    const object = {
      metadata: {},
    };

    // WHEN
    const { container } = render(<NodeMenu object={object} toolbar={false} />);

    // THEN
    expect(container.firstChild).toBeNull();
  });

  it("given unschedulable node should render cordon menu", () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: false,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem[0].querySelectorAll("span")[1]).toHaveTextContent("Shell");
    expect(menuItem[1].querySelectorAll("span")[1]).toHaveTextContent("Cordon");
    expect(menuItem[2].querySelectorAll("span")[1]).toHaveTextContent("Drain");
  });

  it("given schedulable node should render uncordon menu", () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: true,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem[0].querySelectorAll("span")[1]).toHaveTextContent("Shell");
    expect(menuItem[1].querySelectorAll("span")[1]).toHaveTextContent("Uncordon");
    expect(menuItem[2].querySelectorAll("span")[1]).toHaveTextContent("Drain");
  });

  it("click on Shell menu should execute createTerminalTabMock", () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: false,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    fireEvent.click(menuItem[0]);
    expect(createTerminalTabMock).toHaveBeenCalledWith({
      title: `Node: ${nodeName}`,
      node: nodeName,
    });
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("click on Cordon menu should execute sendCommandMock", async () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: false,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem[1].querySelectorAll("span")[1]).toHaveTextContent("Cordon");
    fireEvent.click(menuItem[1]);
    await waitFor(() => {
      expect(sendCommandMock).toHaveBeenCalledWith(`kubectl cordon ${nodeName}`, {
        enter: true,
        newTab: true,
      });
    });

    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("click on Uncordon menu should execute sendCommandMock", async () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: true,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem[1].querySelectorAll("span")[1]).toHaveTextContent("Uncordon");
    fireEvent.click(menuItem[1]);
    await waitFor(() => {
      expect(sendCommandMock).toHaveBeenCalledWith(`kubectl uncordon ${nodeName}`, {
        enter: true,
        newTab: true,
      });
    });

    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("click on Drain menu should execute sendCommandMock", async () => {
    // GIVEN
    const nodeName = "nodeName";
    const object = {
      metadata: {
        name: nodeName,
        selfLink: "selfLink",
      },
      spec: {
        unschedulable: false,
      },
    };

    // WHEN
    expect(() => {
      render(<NodeMenu object={object} toolbar={false} />);
    }).not.toThrow();

    // THEN
    const menuItem = screen.getAllByTestId("menu-item-testid");

    expect(menuItem[2].querySelectorAll("span")[1]).toHaveTextContent("Drain");
    fireEvent.click(menuItem[2]);

    await waitFor(() => {
      expect(sendCommandMock).toHaveBeenCalledWith(
        `kubectl drain ${nodeName} --delete-emptydir-data --ignore-daemonsets --force`,
        {
          enter: true,
          newTab: true,
        },
      );
    });

    expect(openConfirmDialogMock).toHaveBeenCalledTimes(1);
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });
});
