/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import {
  brokenCertificate,
  caCertificate,
  ipAddressCertificate,
  leafCertificate,
} from "../../__tests__/certificates.mock";
import { parseCertificate, parseSecretCertificates } from "../parse-certificates";

describe("parseCertificate", () => {
  it("reads the subject, issuer, alternative names, serial number and validity of a certificate", () => {
    expect(parseCertificate(leafCertificate)).toEqual({
      commonName: "app.example.com",
      organization: "Example Ltd",
      issuer: "Example Root CA",
      dnsNames: ["app.example.com", "www.example.com"],
      ipAddresses: [],
      serialNumber: "1122334455AABB",
      notBefore: Date.parse("2026-09-08T21:18:20.000Z"),
      notAfter: Date.parse("2027-09-08T21:18:20.000Z"),
    });
  });

  it("has no subject alternative names when the certificate carries none", () => {
    expect(parseCertificate(caCertificate)).toMatchObject({
      commonName: "Example Root CA",
      dnsNames: [],
      ipAddresses: [],
    });
  });

  it("reads the IP addresses of the subject alternative names", () => {
    expect(parseCertificate(ipAddressCertificate)).toMatchObject({
      commonName: "Freelens Certificate Authority",
      organization: "Freelens",
      issuer: "Freelens Certificate Authority",
      dnsNames: ["localhost"],
      ipAddresses: ["127.0.0.1"],
    });
  });

  it("returns nothing for a block that is not a certificate", () => {
    expect(parseCertificate(brokenCertificate)).toBeUndefined();
  });

  it("returns plain data that crosses IPC unchanged", () => {
    const certificate = parseCertificate(leafCertificate);

    expect(structuredClone(certificate)).toEqual(certificate);
    expect(typeof certificate?.notBefore).toBe("number");
    expect(typeof certificate?.notAfter).toBe("number");
  });
});

describe("parseSecretCertificates", () => {
  it("reads every certificate of a chain stored under one key, in order", () => {
    const [result] = parseSecretCertificates([{ key: "tls.crt", pems: [leafCertificate, caCertificate] }]);

    expect(result.key).toBe("tls.crt");
    expect(result.certificates.map((certificate) => certificate.commonName)).toEqual([
      "app.example.com",
      "Example Root CA",
    ]);
  });

  it("keeps the readable certificates when one of them is broken", () => {
    const [result] = parseSecretCertificates([{ key: "tls.crt", pems: [brokenCertificate, leafCertificate] }]);

    expect(result.certificates.map((certificate) => certificate.commonName)).toEqual(["app.example.com"]);
  });

  it("keeps the order of the keys and leaves out a key with no readable certificate", () => {
    const result = parseSecretCertificates([
      { key: "tls.crt", pems: [leafCertificate] },
      { key: "broken.crt", pems: [brokenCertificate] },
      { key: "ca.crt", pems: [caCertificate] },
    ]);

    expect(result.map(({ key }) => key)).toEqual(["tls.crt", "ca.crt"]);
  });

  it("ignores an argument of the wrong shape", () => {
    expect(parseSecretCertificates(undefined as never)).toEqual([]);
    expect(
      parseSecretCertificates([
        null as never,
        { key: "tls.crt", pems: "not a list" as never },
        { key: "ca.crt", pems: [42 as never, caCertificate] },
      ]),
    ).toEqual([{ key: "ca.crt", certificates: [parseCertificate(caCertificate)] }]);
  });
});
