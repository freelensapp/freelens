/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { renderFor } from "../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../renderer/getDiForUnitTesting";
import { SecretCertificatesSection } from "../secret-certificates-section";

import type { DiRender } from "../../../../renderer/components/test-utils/renderFor";
import type { CertificateInfo } from "../../common/channels";

const day = 24 * 60 * 60 * 1000;

function certificateExpiringAt(notAfter: number): CertificateInfo {
  return {
    commonName: "app.example.com",
    issuer: "Example Root CA",
    dnsNames: [],
    ipAddresses: [],
    serialNumber: "01",
    notBefore: notAfter - 365 * day,
    notAfter,
  };
}

describe("SecretCertificatesSection", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-user-data");
    render = renderFor(di);
  });

  it("titles a certificate a level below the section title", () => {
    const result = render(
      <SecretCertificatesSection
        certificates={[{ key: "ca.crt", certificates: [certificateExpiringAt(Date.now() + 365 * day)] }]}
      />,
    );

    const sectionTitle = result.getByText("Certificates");
    const certificateTitle = result.getByText("ca.crt");

    expect(sectionTitle).toHaveClass("DrawerTitle");
    expect(certificateTitle).not.toHaveClass("DrawerTitle");
    expect(certificateTitle).toHaveClass("certificate-title");
    expect(certificateTitle.closest(".SecretCertificates")).not.toBeNull();
  });
});
