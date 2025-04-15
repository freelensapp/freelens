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
import type { OpenRoleBindingDialog } from "../dialog/open.injectable";
import openRoleBindingDialogInjectable from "../dialog/open.injectable";
import { RoleBindingDialog } from "../dialog/view";

describe("RoleBindingDialog tests", () => {
  let render: DiRender;
  let openRoleBindingDialog: OpenRoleBindingDialog;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    openRoleBindingDialog = di.inject(openRoleBindingDialogInjectable);

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

  it("should render without any errors", () => {
    const { container } = render(<RoleBindingDialog />);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("role select should be searchable", async () => {
    openRoleBindingDialog();
    const res = render(<RoleBindingDialog />);

    await user.click(await res.findByText("Select role", { exact: false }));

    await res.findAllByText("foobar", {
      exact: false,
    });
  });
});
