import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import createTerminalTabInjectable from "../../dock/terminal/create-terminal-tab.injectable";
import hideDetailsInjectable from "../../kube-detail-params/hide-details.injectable";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { PodShellMenu } from "../pod-shell-menu";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

let execShell: (container: { name: string }) => void = () => {};

// This mock is used to get execShell function from PodShellMenu
vi.mock("../pod-menu-item", () => ({
  __esModule: true,
  default: ({ onMenuItemClick }: { onMenuItemClick: (container: { name: string }) => void }) => {
    execShell = onMenuItemClick;

    return null;
  },
}));

describe("pod-shell-menu", () => {
  let di: DiContainer;
  let render: DiRender;
  let createTerminalTabMock: Mock;
  let hideDetailsMock: Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    createTerminalTabMock = vi.fn();
    hideDetailsMock = vi.fn();

    di.override(createTerminalTabInjectable, () => createTerminalTabMock);
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

  it("opens a pod shell tab for the container, which main runs kubectl exec in", () => {
    const object = {
      metadata: {
        name: "name",
        namespace: "some-namespace",
        selfLink: "selfLink",
      },
    };

    render(<PodShellMenu object={object} toolbar={true} />);

    execShell({ name: "test-container" });

    expect(createTerminalTabMock).toHaveBeenCalledWith({
      title: "Pod: name (namespace: some-namespace)",
      podTerminal: {
        mode: "exec",
        namespace: "some-namespace",
        pod: "name",
        container: "test-container",
        windows: false,
      },
    });
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("opens a pod shell tab that runs PowerShell for a pod on a Windows node", () => {
    const object = {
      metadata: {
        name: "name",
        namespace: "some-namespace",
        selfLink: "selfLink",
      },
      spec: {
        nodeSelector: {
          "kubernetes.io/os": "windows",
        },
      },
    };

    render(<PodShellMenu object={object} toolbar={true} />);

    execShell({ name: "test-container" });

    expect(createTerminalTabMock).toHaveBeenCalledWith(
      expect.objectContaining({ podTerminal: expect.objectContaining({ mode: "exec", windows: true }) }),
    );
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });
});
