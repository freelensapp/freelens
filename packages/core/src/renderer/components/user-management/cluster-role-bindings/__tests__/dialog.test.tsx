/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ClusterRole } from "@freelensapp/kube-object";
import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import directoryForKubeConfigsInjectable from "../../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../../common/cluster/cluster";
import hostedClusterInjectable from "../../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../../stores-apis-can-be-created.injectable";
import showDetailsInjectable from "../../../kube-detail-params/show-details.injectable";
import { renderFor } from "../../../test-utils/renderFor";
import clusterRoleStoreInjectable from "../../cluster-roles/store.injectable";
import closeClusterRoleBindingDialogInjectable from "../dialog/close.injectable";
import openClusterRoleBindingDialogInjectable from "../dialog/open.injectable";
import { ClusterRoleBindingDialog } from "../dialog/view";
import clusterRoleBindingStoreInjectable from "../store.injectable";

import type { UserEvent } from "@testing-library/user-event";

import type { DiRender } from "../../../test-utils/renderFor";
import type { CloseClusterRoleBindingDialog } from "../dialog/close.injectable";
import type { OpenClusterRoleBindingDialog } from "../dialog/open.injectable";
import type { ClusterRoleBindingStore } from "../store";

describe("ClusterRoleBindingDialog tests", () => {
  let render: DiRender;
  let closeClusterRoleBindingDialog: CloseClusterRoleBindingDialog;
  let openClusterRoleBindingDialog: OpenClusterRoleBindingDialog;
  let user: UserEvent;
  let createMock: jest.Mock;
  let updateSubjectsMock: jest.Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    createMock = jest.fn(async () => ({ selfLink: "/created-cluster-role-binding" }));
    updateSubjectsMock = jest.fn(async () => ({ selfLink: "/updated-cluster-role-binding" }));

    di.override(
      clusterRoleBindingStoreInjectable,
      () =>
        ({
          create: createMock,
          updateSubjects: updateSubjectsMock,
        }) as unknown as ClusterRoleBindingStore,
    );
    di.override(showDetailsInjectable, () => jest.fn());

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
    vi.resetAllMocks();
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

  it("creates a new ClusterRoleBinding when opened without an existing binding", async () => {
    openClusterRoleBindingDialog();
    const res = render(<ClusterRoleBindingDialog />);

    // pick the cluster role (the select is autofocused in create mode)
    await user.click(res.getByText("Select cluster role", { exact: false }));
    await user.click(await res.findByRole("option", { name: /foobar/ }));

    // enter a binding name (selecting a role does not auto-fill an empty name)
    await user.type(res.getByPlaceholderText("Name of ClusterRoleBinding ..."), "test-binding");

    // add a user subject so there is at least one binding target
    await user.type(res.getByPlaceholderText("Bind to User Accounts (comma-separated) ..."), "test-user{Enter}");

    const createButton = res.getByText("Create").closest("button") as HTMLButtonElement;
    await user.click(createButton);

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(updateSubjectsMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(
      { name: "test-binding" },
      expect.objectContaining({
        subjects: [{ name: "test-user", kind: "User" }],
        roleRef: { name: "foobar", kind: "ClusterRole" },
      }),
    );
  });
});
