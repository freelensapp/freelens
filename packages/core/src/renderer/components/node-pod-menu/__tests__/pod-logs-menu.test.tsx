import React from "react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import createPodLogsTabInjectable from "../../dock/logs/create-pod-logs-tab.injectable";
import hideDetailsInjectable from "../../kube-detail-params/hide-details.injectable";
import { type DiRender, renderFor } from "../../test-utils/renderFor";
import { PodLogsMenu } from "../pod-logs-menu";

import type { DiContainer } from "@ogre-tools/injectable";

let showLogs: (container: { name: string }) => void = () => {};

// This mock is used to get showLogs function from PodLogsMenu
jest.mock("../pod-menu-item", () => ({
  __esModule: true,
  default: ({ onMenuItemClick }: { onMenuItemClick: (container: { name: string }) => Promise<any> }) => {
    showLogs = onMenuItemClick;

    return null;
  },
}));

describe("pod-logs-menu", () => {
  let di: DiContainer;
  let render: DiRender;
  let hideDetailsMock: jest.Mock;
  let createPodLogsTabMock: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    hideDetailsMock = jest.fn();
    createPodLogsTabMock = jest.fn();

    di.override(hideDetailsInjectable, () => hideDetailsMock);
    di.override(createPodLogsTabInjectable, () => createPodLogsTabMock);

    render = renderFor(di);
  });

  it("given null object should render null component", () => {
    const { container } = render(<PodLogsMenu object={null as never} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given object without metadata should render null component", () => {
    const { container } = render(<PodLogsMenu object={{}} toolbar={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("given non well formed object should render null component", () => {
    const object = {
      metadata: {},
    };

    // WHEN
    const { container } = render(<PodLogsMenu object={object} toolbar={false} />);

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
      render(<PodLogsMenu object={object} toolbar={false} />);
    }).not.toThrow();
  });

  it("showLogs should create pod logs tab and hide details", () => {
    // GIVEN
    const object = {
      metadata: {
        name: "name",
        selfLink: "selfLink",
      },
    };

    // WHEN
    expect(() => {
      render(<PodLogsMenu object={object} toolbar={true} />);
    }).not.toThrow();

    // THEN
    showLogs({ name: "test-container" });
    expect(createPodLogsTabMock).toHaveBeenCalledTimes(1);
    expect(hideDetailsMock).toHaveBeenCalledTimes(1);
  });
});
