/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Secret, SecretType } from "@freelensapp/kube-object";
import { base64 } from "@freelensapp/utilities";
import { act, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForKubeConfigsInjectable from "../../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../common/cluster/cluster";
import {
  brokenCertificate,
  caCertificate,
  ipAddressCertificate,
  leafCertificate,
} from "../../../../features/secret-certificates/__tests__/certificates.mock";
import { parseSecretCertificates } from "../../../../features/secret-certificates/main/parse-certificates";
import requestSecretCertificatesInjectable from "../../../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { SecretDetails } from "../secret-details";

import type { Mock } from "vitest";

import type { SecretCertificates } from "../../../../features/secret-certificates/common/channels";
import type { RequestSecretCertificates } from "../../../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import type { DiRender } from "../../test-utils/renderFor";

vi.mock("../../kube-object-meta/kube-object-meta", () => ({
  KubeObjectMeta: () => null,
}));

const privateKey = `-----BEGIN PRIVATE KEY-----
not a real key
-----END PRIVATE KEY-----`;

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
  let requestSecretCertificates: Mock<RequestSecretCertificates>;

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

    // The main process parses the certificates; here the parser is called
    // directly instead of over the request channel.
    requestSecretCertificates = vi.fn<RequestSecretCertificates>(async (blocks) => parseSecretCertificates(blocks));
    di.override(requestSecretCertificatesInjectable, () => requestSecretCertificates);
  });

  it("should show the visibility toggle when the secret value is ''", () => {
    const result = render(<SecretDetails object={getSecret(SecretType.Opaque, { foobar: "" })} />);

    expect(result.getByTestId("foobar-secret-entry").querySelector(".Icon")).toBeDefined();
  });

  it("shows what is in a certificate stored in the secret", async () => {
    const secret = getSecret(SecretType.TLS, {
      "tls.crt": base64.encode(leafCertificate),
      "tls.key": base64.encode(privateKey),
    });
    const result = render(<SecretDetails object={secret} />);

    expect(await result.findByText("Certificates")).toBeInTheDocument();

    const certificate = result.getByTestId("tls.crt-certificate");

    expect(certificate).toHaveTextContent("tls.crt");
    expect(certificate).toHaveTextContent("app.example.com");
    expect(certificate).toHaveTextContent("Example Ltd");
    expect(certificate).toHaveTextContent("Example Root CA");
    expect(certificate).toHaveTextContent("app.example.com, www.example.com");
    expect(certificate).toHaveTextContent("1122334455AABB");
    expect(certificate).toHaveTextContent("2026-09-08T21:18:20Z");
    expect(certificate).toHaveTextContent("2027-09-08T21:18:20Z");
  });

  it("sends only the certificate blocks to the main process", async () => {
    const secret = getSecret(SecretType.TLS, {
      "tls.crt": base64.encode(`subject=CN = app.example.com\n${leafCertificate}\n`),
      "tls.key": base64.encode(privateKey),
      password: base64.encode("hunter2"),
    });
    const result = render(<SecretDetails object={secret} />);

    await result.findByText("Certificates");

    expect(requestSecretCertificates).toHaveBeenCalledTimes(1);
    expect(requestSecretCertificates).toHaveBeenCalledWith([{ key: "tls.crt", pems: [leafCertificate] }]);
  });

  it("shows each certificate of a chain stored under one key", async () => {
    const secret = getSecret(SecretType.TLS, {
      "tls.crt": base64.encode(`${leafCertificate}\n${caCertificate}\n`),
    });
    const result = render(<SecretDetails object={secret} />);

    expect(await result.findByTestId("tls.crt (1/2)-certificate")).toHaveTextContent("app.example.com");
    expect(result.getByTestId("tls.crt (2/2)-certificate")).toHaveTextContent("Example Root CA");
  });

  it("shows the certificates next to a broken one", async () => {
    const secret = getSecret(SecretType.Opaque, {
      "broken.crt": base64.encode(brokenCertificate),
      "ca.crt": base64.encode(`${brokenCertificate}\n${ipAddressCertificate}`),
    });
    const result = render(<SecretDetails object={secret} />);

    const certificate = await result.findByTestId("ca.crt-certificate");

    expect(certificate).toHaveTextContent("localhost");
    expect(certificate).toHaveTextContent("127.0.0.1");
    expect(result.queryByTestId("broken.crt-certificate")).not.toBeInTheDocument();
  });

  it("has no certificate section when no value is a certificate", async () => {
    const secret = getSecret(SecretType.Opaque, { password: base64.encode("hunter2") });
    const result = render(<SecretDetails object={secret} />);

    await Promise.resolve();

    expect(result.queryByText("Certificates")).not.toBeInTheDocument();
    expect(requestSecretCertificates).not.toHaveBeenCalled();
  });

  it("has no certificate section when no certificate can be read", async () => {
    const secret = getSecret(SecretType.Opaque, { "broken.crt": base64.encode(brokenCertificate) });
    const result = render(<SecretDetails object={secret} />);

    await vi.waitFor(() => expect(requestSecretCertificates).toHaveBeenCalled());
    await requestSecretCertificates.mock.results[0].value;

    expect(result.queryByText("Certificates")).not.toBeInTheDocument();
  });

  it("reads the certificates again when the data changes, and ignores the response to an older request", async () => {
    const responders: ((value: SecretCertificates[]) => void)[] = [];

    requestSecretCertificates.mockImplementation(() => new Promise((resolve) => responders.push(resolve)));

    const secret = getSecret(SecretType.TLS, { "tls.crt": base64.encode(leafCertificate) });
    const result = render(<SecretDetails object={secret} />);
    const input = result.getByTestId("tls.crt-secret-entry").querySelector("textarea");

    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLTextAreaElement, { target: { value: base64.encode(caCertificate) } });

    expect(requestSecretCertificates).toHaveBeenCalledTimes(2);
    expect(requestSecretCertificates).toHaveBeenLastCalledWith([{ key: "tls.crt", pems: [caCertificate] }]);

    responders[1](parseSecretCertificates([{ key: "tls.crt", pems: [caCertificate] }]));
    expect(await result.findByTestId("tls.crt-certificate")).toHaveTextContent("Example Root CA");

    responders[0](parseSecretCertificates([{ key: "tls.crt", pems: [leafCertificate] }]));
    await act(async () => {});

    expect(result.getByTestId("tls.crt-certificate")).not.toHaveTextContent("app.example.com");
  });
});
