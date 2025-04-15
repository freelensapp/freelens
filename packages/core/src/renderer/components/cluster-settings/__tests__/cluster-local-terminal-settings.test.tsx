/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Stats } from "fs";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Cluster } from "../../../../common/cluster/cluster";
import loadKubeconfigInjectable from "../../../../common/cluster/load-kubeconfig.injectable";
import statInjectable from "../../../../common/fs/stat.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import type { DiRender } from "../../test-utils/renderFor";
import { renderFor } from "../../test-utils/renderFor";
import { ClusterLocalTerminalSetting } from "../local-terminal-settings";

describe("ClusterLocalTerminalSettings", () => {
  let render: DiRender;
  let showErrorNotificationMock: jest.Mock;
  let statMock: jest.Mock;
  let loadKubeconfigMock: jest.Mock;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    showErrorNotificationMock = jest.fn();

    statMock = jest.fn();

    di.override(statInjectable, () => statMock);

    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);

    loadKubeconfigMock = jest.fn();
    di.override(loadKubeconfigInjectable, () => loadKubeconfigMock);

    render = renderFor(di);

    user = userEvent.setup();
  });

  it("should render the current settings", async () => {
    loadKubeconfigMock.mockImplementation(() => ({
      getContextObject: () => ({}),
    }));

    const cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
      preferences: {
        terminalCWD: "/foobar",
        defaultNamespace: "kube-system",
      },
    });
    const dom = render(<ClusterLocalTerminalSetting cluster={cluster} />);

    expect(await dom.findByDisplayValue("/foobar")).toBeDefined();
    expect(await dom.findByDisplayValue("kube-system")).toBeDefined();
  });

  it("should change placeholder for 'Default Namespace' to be the namespace from the kubeconfig", async () => {
    loadKubeconfigMock.mockImplementation(() => ({
      getContextObject: () => ({ namespace: "blat" }),
    }));

    const cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
      preferences: {
        terminalCWD: "/foobar",
      },
    });

    const dom = render(<ClusterLocalTerminalSetting cluster={cluster} />);

    expect(await dom.findByDisplayValue("/foobar")).toBeDefined();
    expect(await dom.findByPlaceholderText("blat")).toBeDefined();
  });

  it("should save the new default namespace after clicking away", async () => {
    loadKubeconfigMock.mockImplementation(() => ({
      getContextObject: () => ({}),
    }));

    const cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
      preferences: {
        terminalCWD: "/foobar",
      },
    });

    const dom = render(<ClusterLocalTerminalSetting cluster={cluster} />);
    const dn = await dom.findByTestId("default-namespace");

    await user.click(dn);
    await user.type(dn, "kube-system");
    await user.click(dom.baseElement);

    await waitFor(() => expect(cluster.preferences.defaultNamespace).toBe("kube-system"));
  });

  it("should save the new CWD if path is a directory", async () => {
    statMock.mockImplementation(async (path) => {
      expect(path).toBe("/foobar");

      return {
        isDirectory: () => true,
      } as Stats;
    });

    loadKubeconfigMock.mockImplementation(() => ({
      getContextObject: () => ({}),
    }));

    const cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
    });

    const dom = render(<ClusterLocalTerminalSetting cluster={cluster} />);
    const dn = await dom.findByTestId("working-directory");

    await user.click(dn);
    await user.type(dn, "/foobar");
    await user.click(dom.baseElement);

    await waitFor(() => expect(cluster.preferences?.terminalCWD).toBe("/foobar"));
  });

  it("should not save the new CWD if path is a file", async () => {
    statMock.mockImplementation(async (path) => {
      expect(path).toBe("/foobar");

      return {
        isDirectory: () => false,
        isFile: () => true,
      } as Stats;
    });

    loadKubeconfigMock.mockImplementation(() => ({
      getContextObject: () => ({}),
    }));

    const cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some/path",
    });

    const dom = render(<ClusterLocalTerminalSetting cluster={cluster} />);
    const dn = await dom.findByTestId("working-directory");

    await user.click(dn);
    await user.type(dn, "/foobar");
    await user.click(dom.baseElement);

    await waitFor(() => expect(showErrorNotificationMock).toHaveBeenCalled());
  });
});
