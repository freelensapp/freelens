/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./secret-certificates.scss";

import { cssNames, formatDuration } from "@freelensapp/utilities";
import { observer } from "mobx-react";
import { reactiveNow } from "../../../common/utils/reactive-now/reactive-now";
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

/**
 * The expiry moves on while the details stay open, as "Created" does: every
 * second while `formatDuration` shows seconds, under three hours away, and
 * every minute otherwise. The marks change with it when the time comes.
 */
const CertificateExpiry = observer(({ title, notAfter }: { title: string; notAfter: number }) => {
  const interval = Math.abs(notAfter - Date.now()) < 3 * 60 * 60 * 1000 ? 1000 : 60 * 1000;
  const expiry = describeExpiry(notAfter, reactiveNow(interval));

  return (
    <span
      className={cssNames("expiry", { expired: expiry.expired, "expires-soon": expiry.expiresSoon })}
      data-testid={`${title}-certificate-expiry`}
    >
      {expiry.text} (<LocaleDate date={new Date(notAfter)} />)
    </span>
  );
});

function CertificateDetails({ title, certificate }: { title: string; certificate: CertificateInfo }) {
  const { commonName, organization, issuer, dnsNames, ipAddresses, serialNumber, notBefore, notAfter } = certificate;

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
        <CertificateExpiry title={title} notAfter={notAfter} />
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
