/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { SubjectAlternativeNameExtension, X509Certificate } from "@peculiar/x509";

import type { Name } from "@peculiar/x509";

const beginCertificate = "-----BEGIN CERTIFICATE-----";
const pemCertificate = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;

export interface CertificateInfo {
  commonName: string | undefined;
  organization: string | undefined;
  issuer: string | undefined;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  dnsNames: string[];
}

function firstField(name: Name, type: string): string | undefined {
  return name.getField(type)[0];
}

function dnsNames(certificate: X509Certificate): string[] {
  const extension = certificate.getExtension(SubjectAlternativeNameExtension);

  if (!extension) {
    return [];
  }

  return extension.names.items.filter((name) => name.type === "dns").map((name) => name.value);
}

function toCertificateInfo(certificate: X509Certificate): CertificateInfo {
  return {
    commonName: firstField(certificate.subjectName, "CN"),
    organization: firstField(certificate.subjectName, "O"),
    issuer: firstField(certificate.issuerName, "CN") ?? certificate.issuer,
    // Hex, as openssl and the browsers print it
    serialNumber: certificate.serialNumber.toUpperCase(),
    notBefore: certificate.notBefore,
    notAfter: certificate.notAfter,
    dnsNames: dnsNames(certificate),
  };
}

/**
 * Reads every PEM certificate in `value`, skipping the ones that fail to parse.
 *
 * A secret can hold a whole chain under one key, and TLS secrets built by hand
 * sometimes carry a truncated or otherwise broken entry next to good ones, so a
 * bad block should not hide the rest.
 */
export function parseCertificates(value: string): CertificateInfo[] {
  if (!value.includes(beginCertificate)) {
    return [];
  }

  const certificates: CertificateInfo[] = [];

  for (const pem of value.match(pemCertificate) ?? []) {
    try {
      certificates.push(toCertificateInfo(new X509Certificate(pem)));
    } catch {
      // Not a certificate we can read, leave it out of the summary
    }
  }

  return certificates;
}
