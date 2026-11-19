import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import createTerminalTabInjectable from "../../dock/terminal/create-terminal-tab.injectable";
import hideDetailsInjectable from "../../kube-detail-params/hide-details.injectable";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { PodAttachMenu } from "../pod-attach-menu";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

let attachToPod: (container: { name: string }) => void = () => {};

// This mock is used to get attachToPod function from PodAttachMenu
vi.mock("../pod-menu-item", () => ({
  __esModule: true,
  default: ({ onMenuItemClick }: { onMenuItemClick: (container: { name: string }) => void }) => {
    attachToPod = onMenuItemClick;

    return null;
  },
}));

describe("pod-attach-menu", () => {
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
    const { container } = render(<PodAttachMenu object={null as never} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given object without metadata should render null component", () => {
    const { container } = render(<PodAttachMenu object={{}} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given non well formed object should render null component", () => {
    const object = {
      metadata: {},
    };

    // WHEN
    const { container } = render(<PodAttachMenu object={object} toolbar={false} />);

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
      render(<PodAttachMenu object={object} toolbar={false} />);
    }).not.toThrow();
  });

  it("opens a pod attach tab for the container, which main runs kubectl attach in", () => {
    const object = {
      metadata: {
        name: "name",
        namespace: "some-namespace",
        selfLink: "selfLink",
      },
    };

    render(<PodAttachMenu object={object} toolbar={true} />);

    attachToPod({ name: "test-container" });

    expect(createTerminalTabMock).toHaveBeenCalledWith({
      title: "Pod: name (namespace: some-namespace) [Attached]",
      podTerminal: { mode: "attach", namespace: "some-namespace", pod: "name", container: "test-container" },
    });
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });
});
