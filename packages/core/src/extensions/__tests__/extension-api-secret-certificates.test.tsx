/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { base64 } from "@freelensapp/utilities";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { leafCertificate } from "../../features/secret-certificates/__tests__/certificates.mock";
import { parseSecretCertificates } from "../../features/secret-certificates/main/parse-certificates";
import requestSecretCertificatesInjectable from "../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import { renderFor } from "../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { Renderer } from "../extension-api";

import type { Mock } from "vitest";

import type { RequestSecretCertificates } from "../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import type { DiRender } from "../../renderer/components/test-utils/renderFor";

// `Renderer.Component.SecretCertificates` as an extension renders it: given
// the data of a secret, with no request or parser of its own.
describe("Renderer.Component.SecretCertificates", () => {
  const { SecretCertificates } = Renderer.Component;
  let render: DiRender;
  let requestSecretCertificates: Mock<RequestSecretCertificates>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-data");

    // The main process parses the certificates; here the parser is called
    // directly instead of over the request channel.
    requestSecretCertificates = vi.fn<RequestSecretCertificates>(async (blocks) => parseSecretCertificates(blocks));
    di.override(requestSecretCertificatesInjectable, () => requestSecretCertificates);

    render = renderFor(di);
  });

  it("shows the certificates of a secret that holds one", async () => {
    const result = render(
      <SecretCertificates
        data={{ "tls.crt": base64.encode(leafCertificate), "tls.key": base64.encode("not a certificate") }}
      />,
    );

    expect(await result.findByText("Certificates")).toBeInTheDocument();
    expect(result.getByTestId("tls.crt-certificate")).toHaveTextContent("app.example.com");
    expect(requestSecretCertificates).toHaveBeenCalledWith([{ key: "tls.crt", pems: [leafCertificate] }]);
  });

  it("renders nothing for a secret without a certificate", async () => {
    const result = render(<SecretCertificates data={{ password: base64.encode("hunter2") }} />);

    await Promise.resolve();

    expect(result.container).toBeEmptyDOMElement();
    expect(requestSecretCertificates).not.toHaveBeenCalled();
  });
});
