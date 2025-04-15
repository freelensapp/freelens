/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ClusterRole } from "@freelensapp/kube-object";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import React from "react";
import directoryForKubeConfigsInjectable from "../../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../../common/cluster/cluster";
import hostedClusterInjectable from "../../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../../stores-apis-can-be-created.injectable";
import type { DiRender } from "../../../test-utils/renderFor";
import { renderFor } from "../../../test-utils/renderFor";
import clusterRoleStoreInjectable from "../../cluster-roles/store.injectable";
import type { CloseClusterRoleBindingDialog } from "../dialog/close.injectable";
import closeClusterRoleBindingDialogInjectable from "../dialog/close.injectable";
import type { OpenClusterRoleBindingDialog } from "../dialog/open.injectable";
import openClusterRoleBindingDialogInjectable from "../dialog/open.injectable";
import { ClusterRoleBindingDialog } from "../dialog/view";

describe("ClusterRoleBindingDialog tests", () => {
  let render: DiRender;
  let closeClusterRoleBindingDialog: CloseClusterRoleBindingDialog;
  let openClusterRoleBindingDialog: OpenClusterRoleBindingDialog;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    closeClusterRoleBindingDialog = di.inject(closeClusterRoleBindingDialogInjectable);
    openClusterRoleBindingDialog = di.inject(openClusterRoleBindingDialogInjectable);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );

    render = renderFor(di);

    const store = di.inject(clusterRoleStoreInjectable);

    store.items.replace([
      new ClusterRole({
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          name: "foobar",
          resourceVersion: "1",
          uid: "1",
          selfLink: "/apis/rbac.authorization.k8s.io/v1/clusterroles/foobar",
        },
      }),
    ]);

    user = userEvent.setup();
  });

  afterEach(() => {
    closeClusterRoleBindingDialog();
    jest.resetAllMocks();
  });

  it("should render without any errors", () => {
    const { container } = render(<ClusterRoleBindingDialog />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("clusterrole select should be searchable", async () => {
    openClusterRoleBindingDialog();
    const res = render(<ClusterRoleBindingDialog />);

    await user.keyboard("a");
    await res.findAllByText("foobar");
  });
});
