/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { X509Certificate } from "node:crypto";

import type { CertificateInfo, SecretCertificateBlocks, SecretKeyCertificates } from "../common/channels";

type LegacyName = Partial<Record<string, string | string[]>>;

// `toLegacyObject()` gives a repeated attribute as an array of its values
function nameField(name: LegacyName | undefined, field: string): string | undefined {
  const value = name?.[field];

  return Array.isArray(value) ? value.join(", ") : value;
}

// An entry of `subjectAltName` is `type:value`, and entries are separated by
// ", ". Node quotes a value as a JSON string when it holds a character that
// would make the list ambiguous, such as a comma.
const subjectAltNameEntry = /([^:,]+):("(?:[^"\\]|\\.)*"|[^,]*)(?:, |$)/gy;

function subjectAltNames(subjectAltName: string | undefined): { type: string; value: string }[] {
  if (!subjectAltName) {
    return [];
  }

  const entries: { type: string; value: string }[] = [];

  for (const [, type, rawValue] of subjectAltName.matchAll(subjectAltNameEntry)) {
    let value = rawValue;

    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        // Keep the value as Node printed it
      }
    }

    entries.push({ type, value });
  }

  return entries;
}

/**
 * Reads one PEM certificate, or returns `undefined` when it does not parse.
 */
export function parseCertificate(pem: string): CertificateInfo | undefined {
  let certificate: X509Certificate;

  try {
    certificate = new X509Certificate(pem);
  } catch {
    return undefined;
  }

  const legacy = certificate.toLegacyObject();
  const subject = legacy.subject as LegacyName | undefined;
  const issuer = legacy.issuer as LegacyName | undefined;
  const altNames = subjectAltNames(certificate.subjectAltName);

  return {
    commonName: nameField(subject, "CN"),
    organization: nameField(subject, "O"),
    issuer: nameField(issuer, "CN") ?? certificate.issuer.split("\n").join(", "),
    dnsNames: altNames.filter(({ type }) => type === "DNS").map(({ value }) => value),
    ipAddresses: altNames.filter(({ type }) => type === "IP Address").map(({ value }) => value),
    serialNumber: certificate.serialNumber.toUpperCase(),
    notBefore: certificate.validFromDate.getTime(),
    notAfter: certificate.validToDate.getTime(),
  };
}

/**
 * Reads every PEM certificate of every key, skipping the blocks that fail to
 * parse, so that one broken entry cannot hide the certificates next to it. A
 * key none of whose blocks parse is left out.
 */
export function parseSecretCertificates(blocks: SecretCertificateBlocks[]): SecretKeyCertificates[] {
  const result: SecretKeyCertificates[] = [];

  if (!Array.isArray(blocks)) {
    return result;
  }

  // The argument comes over IPC, so its shape is checked rather than trusted
  for (const block of blocks) {
    if (typeof block?.key !== "string" || !Array.isArray(block.pems)) {
      continue;
    }

    const certificates = block.pems
      .filter((pem): pem is string => typeof pem === "string")
      .map(parseCertificate)
      .filter((certificate): certificate is CertificateInfo => certificate !== undefined);

    if (certificates.length > 0) {
      result.push({ key: block.key, certificates });
    }
  }

  return result;
}
