import os from "os";
import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import createTerminalTabInjectable from "../../dock/terminal/create-terminal-tab.injectable";
import sendCommandInjectable from "../../dock/terminal/send-command.injectable";
import hideDetailsInjectable from "../../kube-detail-params/hide-details.injectable";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { PodShellMenu } from "../pod-shell-menu";

import type { DiContainer } from "@ogre-tools/injectable";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mocked-id"),
}));

let execShell: (container: { name: string }) => Promise<void> = async () => {};

// This mock is used to get attachToPod function from PodShellMenu
jest.mock("../pod-menu-item", () => ({
  __esModule: true,
  default: ({ onMenuItemClick }: { onMenuItemClick: (container: { name: string }) => Promise<any> }) => {
    execShell = onMenuItemClick;

    return null;
  },
}));

describe("pod-shell-menu", () => {
  let di: DiContainer;
  let render: DiRender;
  let createTerminalTabMock: jest.Mock;
  let sendCommandMock: jest.Mock;
  let hideDetailsMock: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    createTerminalTabMock = jest.fn();
    sendCommandMock = jest.fn(() => Promise.resolve());
    hideDetailsMock = jest.fn();

    di.override(createTerminalTabInjectable, () => createTerminalTabMock);
    di.override(sendCommandInjectable, () => sendCommandMock);
    di.override(hideDetailsInjectable, () => hideDetailsMock);

    render = renderFor(di);
  });

  it("given null object should render null component", () => {
    const { container } = render(<PodShellMenu object={null as never} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given object without metadata should render null component", () => {
    const { container } = render(<PodShellMenu object={{}} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given non well formed object should render null component", () => {
    const object = {
      metadata: {},
    };

    // WHEN
    const { container } = render(<PodShellMenu object={object} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given well formed object should render", () => {
    // GIVEN
    const object = {
      metadata: {
        name: "name",
        selfLink: "selfLink",
      },
    };

    // WHEN
    expect(() => {
      render(<PodShellMenu object={object} toolbar={false} />);
    }).not.toThrow();
  });

  it("execShell on non windows platform should send exec command", async () => {
    // GIVEN
    const object = {
      metadata: {
        name: "name",
        selfLink: "selfLink",
      },
    };

    jest.spyOn(os, "platform").mockReturnValue("linux");

    // WHEN
    expect(() => {
      render(<PodShellMenu object={object} toolbar={true} />);
    }).not.toThrow();

    // THEN
    await expect(execShell({ name: "test-container" })).resolves.toBeUndefined();
    expect(createTerminalTabMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock).toHaveBeenCalledWith(
      'exec kubectl exec -i -t -n  name -c test-container -- sh -c "clear; (bash || ash || sh)"',
      { enter: true, tabId: "mocked-id" },
    );
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("execShell on windows platform should send exec command", async () => {
    // GIVEN
    const object = {
      metadata: {
        name: "name",
        selfLink: "selfLink",
      },
    };

    jest.spyOn(os, "platform").mockReturnValue("win32");

    // WHEN
    expect(() => {
      render(<PodShellMenu object={object} toolbar={true} />);
    }).not.toThrow();

    // THEN
    await expect(execShell({ name: "test-container" })).resolves.toBeUndefined();
    expect(createTerminalTabMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock).toHaveBeenCalledWith(
      'kubectl exec -i -t -n  name -c test-container -- sh -c "clear; (bash || ash || sh)"',
      { enter: true, tabId: "mocked-id" },
    );
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("execShell on windows node should send exec command", async () => {
    // GIVEN
    const object = {
      metadata: {
        name: "name",
        selfLink: "selfLink",
      },
      spec: {
        nodeSelector: {
          "kubernetes.io/os": "windows",
        },
      },
    };

    // WHEN
    expect(() => {
      render(<PodShellMenu object={object} toolbar={true} />);
    }).not.toThrow();

    // THEN
    await expect(execShell({ name: "test-container" })).resolves.toBeUndefined();
    expect(createTerminalTabMock).toHaveBeenCalledTimes(1);
    expect(sendCommandMock).toHaveBeenCalledWith("kubectl exec -i -t -n  name -c test-container -- powershell", {
      enter: true,
      tabId: "mocked-id",
    });
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });
});
