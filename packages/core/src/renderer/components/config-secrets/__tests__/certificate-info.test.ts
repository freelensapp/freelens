/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { parseCertificates } from "../certificate-info";
import { caCertificate, leafCertificate } from "./certificates.mock";

describe("parseCertificates", () => {
  it("returns nothing when the value holds no certificate", () => {
    expect(parseCertificates("hunter2")).toEqual([]);
  });

  it("reads the subject, issuer, serial number and validity of a certificate", () => {
    const [certificate] = parseCertificates(leafCertificate);

    expect(certificate).toMatchObject({
      commonName: "app.example.com",
      organization: "Example Ltd",
      issuer: "Example Root CA",
      serialNumber: "1122334455AABB",
      dnsNames: ["app.example.com", "www.example.com"],
    });
    expect(certificate.notBefore.toISOString()).toBe("2026-09-08T21:18:20.000Z");
    expect(certificate.notAfter.toISOString()).toBe("2027-09-08T21:18:20.000Z");
  });

  it("reads every certificate of a chain stored under one key", () => {
    const certificates = parseCertificates(`${leafCertificate}\n${caCertificate}`);

    expect(certificates.map((certificate) => certificate.commonName)).toEqual(["app.example.com", "Example Root CA"]);
  });

  it("keeps the readable certificates when one of them is broken", () => {
    const broken = "-----BEGIN CERTIFICATE-----\nnot really a certificate\n-----END CERTIFICATE-----";
    const certificates = parseCertificates(`${broken}\n${leafCertificate}`);

    expect(certificates.map((certificate) => certificate.commonName)).toEqual(["app.example.com"]);
  });

  it("has no subject alternative names when the certificate carries none", () => {
    const [certificate] = parseCertificates(caCertificate);

    expect(certificate.dnsNames).toEqual([]);
  });
});
