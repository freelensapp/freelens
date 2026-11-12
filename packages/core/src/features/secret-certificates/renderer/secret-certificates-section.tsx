/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./secret-certificates.scss";

import { cssNames, formatDuration } from "@freelensapp/utilities";
import { DrawerItem, DrawerTitle } from "../../../renderer/components/drawer";
import { LocaleDate } from "../../../renderer/components/locale-date";

import type { CertificateInfo, SecretKeyCertificates } from "../common/channels";

export interface SecretCertificatesSectionProps {
  certificates: SecretKeyCertificates[];
}

/**
 * How long before its expiry a certificate is marked as expiring soon.
 */
const expiresSoonMs = 30 * 24 * 60 * 60 * 1000;

/**
 * The time left until the expiry, or passed since it, in the words and units
 * of the "Created" item of the details. `formatDuration` writes English units
 * whatever the locale of the system, unlike `formatRelativeTime`.
 */
function describeExpiry(notAfter: number, now: number) {
  const remaining = notAfter - now;

  if (remaining <= 0) {
    return { text: `${formatDuration(-remaining, false)} ago`, expired: true, expiresSoon: false };
  }

  return { text: `in ${formatDuration(remaining, false)}`, expired: false, expiresSoon: remaining <= expiresSoonMs };
}

function CertificateDetails({ title, certificate }: { title: string; certificate: CertificateInfo }) {
  const { commonName, organization, issuer, dnsNames, ipAddresses, serialNumber, notBefore, notAfter } = certificate;
  const expiry = describeExpiry(notAfter, Date.now());

  return (
    <div className="certificate" data-testid={`${title}-certificate`}>
      <div className="certificate-title">{title}</div>
      <DrawerItem name="Common Name" hidden={!commonName}>
        {commonName}
      </DrawerItem>
      <DrawerItem name="Organization" hidden={!organization}>
        {organization}
      </DrawerItem>
      <DrawerItem name="Issuer" hidden={!issuer}>
        {issuer}
      </DrawerItem>
      <DrawerItem name="DNS Names" hidden={dnsNames.length === 0}>
        {dnsNames.join(", ")}
      </DrawerItem>
      <DrawerItem name="IP Addresses" hidden={ipAddresses.length === 0}>
        {ipAddresses.join(", ")}
      </DrawerItem>
      <DrawerItem name="Serial Number">{serialNumber}</DrawerItem>
      <DrawerItem name="Not Before">
        <LocaleDate date={new Date(notBefore)} />
      </DrawerItem>
      <DrawerItem name="Expires">
        <span
          className={cssNames("expiry", { expired: expiry.expired, "expires-soon": expiry.expiresSoon })}
          data-testid={`${title}-certificate-expiry`}
        >
          {expiry.text} (<LocaleDate date={new Date(notAfter)} />)
        </span>
      </DrawerItem>
    </div>
  );
}

/**
 * The certificates found in the data of a secret, one block per certificate,
 * titled with the key, or with `key (n/m)` for each certificate of a chain
 * stored under one key. Renders nothing when there is no certificate.
 */
export function SecretCertificatesSection({ certificates }: SecretCertificatesSectionProps) {
  if (certificates.length === 0) {
    return null;
  }

  return (
    <div className="SecretCertificates">
      <DrawerTitle>Certificates</DrawerTitle>
      {certificates.flatMap(({ key, certificates: chain }) =>
        chain.map((certificate, index) => {
          const title = chain.length > 1 ? `${key} (${index + 1}/${chain.length})` : key;

          return <CertificateDetails key={`${key}\0${index}`} title={title} certificate={certificate} />;
        }),
      )}
    </div>
  );
}
