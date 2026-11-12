/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannel } from "@freelensapp/messaging";

/**
 * The PEM certificate blocks found under one key of a secret's data. Only the
 * `-----BEGIN CERTIFICATE-----` … `-----END CERTIFICATE-----` blocks are sent,
 * never the rest of the value.
 */
export interface SecretCertificateBlocks {
  key: string;
  pems: string[];
}

/**
 * What the secret details show of one certificate. Plain data, so that it
 * crosses IPC unchanged: the dates are epoch milliseconds.
 */
export interface CertificateInfo {
  commonName?: string;
  organization?: string;
  issuer: string;
  dnsNames: string[];
  ipAddresses: string[];
  /** Hex, as openssl and the browsers print it */
  serialNumber: string;
  notBefore: number;
  notAfter: number;
}

/**
 * The certificates read under one key, in the order of the blocks, without
 * the blocks that failed to parse.
 */
export interface SecretCertificates {
  key: string;
  certificates: CertificateInfo[];
}

export const parseSecretCertificatesChannel = getRequestChannel<SecretCertificateBlocks[], SecretCertificates[]>(
  "parse-secret-certificates",
);
