/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatRelativeTime } from "@freelensapp/utilities";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  function renderExpiry(notAfter: number) {
    const result = render(
      <SecretCertificatesSection
        certificates={[{ key: "tls.crt", certificates: [certificateExpiringAt(notAfter)] }]}
      />,
    );

    return result.getByTestId("tls.crt-certificate-expiry");
  }

  describe("given the system formats relative times in Polish", () => {
    const { RelativeTimeFormat } = Intl;

    beforeEach(() => {
      Object.defineProperty(Intl, "RelativeTimeFormat", {
        configurable: true,
        writable: true,
        value: class extends RelativeTimeFormat {
          constructor(_locales?: string | string[], options?: Intl.RelativeTimeFormatOptions) {
            super("pl", options);
          }
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(Intl, "RelativeTimeFormat", {
        configurable: true,
        writable: true,
        value: RelativeTimeFormat,
      });
    });

    it("the relative times of the system are in Polish", () => {
      expect(formatRelativeTime(Date.now() + 90 * day)).toMatch(/^za /);
    });

    it("shows the time until the expiry in English", () => {
      expect(renderExpiry(Date.now() + 90 * day)).toHaveTextContent(/^in 89d 23h 59m \(/);
    });

    it("shows the time since the expiry in English", () => {
      expect(renderExpiry(Date.now() - 3 * day - 2 * 60 * 60 * 1000)).toHaveTextContent(/^3d 2h ago \(/);
    });
  });

  it("marks the expiry of an expired certificate", () => {
    const expiry = renderExpiry(Date.now() - day);

    expect(expiry).toHaveClass("expired");
    expect(expiry).not.toHaveClass("expires-soon");
  });

  it("marks the expiry of a certificate that expires within 30 days", () => {
    const expiry = renderExpiry(Date.now() + 29 * day);

    expect(expiry).toHaveClass("expires-soon");
    expect(expiry).not.toHaveClass("expired");
  });

  it("does not mark the expiry of a certificate that expires later", () => {
    const expiry = renderExpiry(Date.now() + 31 * day);

    expect(expiry).not.toHaveClass("expires-soon");
    expect(expiry).not.toHaveClass("expired");
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
