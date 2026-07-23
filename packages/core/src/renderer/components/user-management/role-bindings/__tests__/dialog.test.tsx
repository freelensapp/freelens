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
import openRoleBindingDialogInjectable from "../dialog/open.injectable";
import { RoleBindingDialog } from "../dialog/view";
import roleBindingStoreInjectable from "../store.injectable";

import type { UserEvent } from "@testing-library/user-event";

import type { DiRender } from "../../../test-utils/renderFor";
import type { OpenRoleBindingDialog } from "../dialog/open.injectable";
import type { RoleBindingStore } from "../store";

describe("RoleBindingDialog tests", () => {
  let render: DiRender;
  let openRoleBindingDialog: OpenRoleBindingDialog;
  let user: UserEvent;
  let createMock: jest.Mock;
  let updateSubjectsMock: jest.Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    createMock = jest.fn(async () => ({ selfLink: "/created-role-binding" }));
    updateSubjectsMock = jest.fn(async () => ({ selfLink: "/updated-role-binding" }));

    di.override(
      roleBindingStoreInjectable,
      () =>
        ({
          create: createMock,
          updateSubjects: updateSubjectsMock,
        }) as unknown as RoleBindingStore,
    );
    di.override(showDetailsInjectable, () => jest.fn());

    openRoleBindingDialog = di.inject(openRoleBindingDialogInjectable);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
          accessibleNamespaces: ["default"],
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

  it("creates a new RoleBinding when opened without an existing binding", async () => {
    openRoleBindingDialog();
    const res = render(<RoleBindingDialog />);

    // the dialog renders into a portal, so open each Select by clicking its control
    const openSelect = (inputId: string) =>
      user.click(res.baseElement.querySelector(`#${inputId}`)?.closest(".Select__control") as HTMLElement);

    // pick the namespace
    await openSelect("dialog-namespace-input");
    await user.click(await res.findByRole("option", { name: /default/ }));

    // pick the role reference (a ClusterRole is always listed regardless of namespace)
    await openSelect("role-reference-input");
    await user.click(await res.findByRole("option", { name: /foobar/ }));

    // enter a binding name (the only plain input with neither an id nor a placeholder)
    const nameInput = Array.from(res.baseElement.querySelectorAll("input")).find(
      (el) => !el.id && !(el as HTMLInputElement).placeholder,
    ) as HTMLInputElement;
    await user.type(nameInput, "test-binding");

    // add a user subject so there is at least one binding target
    await user.type(res.getByPlaceholderText("Bind to User Accounts (comma-separated) ..."), "test-user{Enter}");

    const createButton = res.getByText("Create").closest("button") as HTMLButtonElement;
    await user.click(createButton);

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(updateSubjectsMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(
      { name: "test-binding", namespace: "default" },
      expect.objectContaining({
        subjects: [{ name: "test-user", kind: "User" }],
        roleRef: { name: "foobar", kind: "ClusterRole" },
      }),
    );
  });
});
