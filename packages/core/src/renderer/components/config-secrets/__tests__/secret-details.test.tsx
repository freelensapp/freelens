/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Secret, SecretType } from "@freelensapp/kube-object";
import { base64 } from "@freelensapp/utilities";
import directoryForKubeConfigsInjectable from "../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../common/cluster/cluster";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { SecretDetails } from "../secret-details";
import { leafCertificate } from "./certificates.mock";

import type { DiRender } from "../../test-utils/renderFor";

vi.mock("../../kube-object-meta/kube-object-meta", () => ({
  KubeObjectMeta: () => null,
}));

function getSecret(type: SecretType, data: Partial<Record<string, string>>) {
  return new Secret({
    apiVersion: "v1",
    kind: "secret",
    metadata: {
      name: "test",
      resourceVersion: "1",
      uid: "uid",
      namespace: "default",
      selfLink: "/api/v1/secrets/default/test",
    },
    data,
    type,
  });
}

describe("SecretDetails tests", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    render = renderFor(di);

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );
  });

  it("should show the visibility toggle when the secret value is ''", () => {
    const result = render(<SecretDetails object={getSecret(SecretType.Opaque, { foobar: "" })} />);

    expect(result.getByTestId("foobar-secret-entry").querySelector(".Icon")).toBeDefined();
  });

  it("shows what is in a certificate stored in the secret", () => {
    const secret = getSecret(SecretType.TLS, { "tls.crt": base64.encode(leafCertificate) });
    const result = render(<SecretDetails object={secret} />);

    expect(result.getByText("app.example.com")).toBeInTheDocument();
    expect(result.getByText("Example Root CA")).toBeInTheDocument();
    expect(result.getByText("1122334455AABB")).toBeInTheDocument();
  });

  it("has no certificate section when no value is a certificate", () => {
    const secret = getSecret(SecretType.Opaque, { password: base64.encode("hunter2") });
    const result = render(<SecretDetails object={secret} />);

    expect(result.queryByText("Certificates")).not.toBeInTheDocument();
  });
});
