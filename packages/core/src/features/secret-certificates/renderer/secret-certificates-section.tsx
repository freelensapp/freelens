/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { formatRelativeTime } from "@freelensapp/utilities";
import { DrawerItem, DrawerTitle } from "../../../renderer/components/drawer";
import { LocaleDate } from "../../../renderer/components/locale-date";

import type { CertificateInfo, SecretKeyCertificates } from "../common/channels";

export interface SecretCertificatesSectionProps {
  certificates: SecretKeyCertificates[];
}

function CertificateDetails({ title, certificate }: { title: string; certificate: CertificateInfo }) {
  const { commonName, organization, issuer, dnsNames, ipAddresses, serialNumber, notBefore, notAfter } = certificate;

  return (
    <div className="mb-2" data-testid={`${title}-certificate`}>
      <DrawerTitle size="sub-title">{title}</DrawerTitle>
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
        {formatRelativeTime(notAfter)} (<LocaleDate date={new Date(notAfter)} />)
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
    <>
      <DrawerTitle>Certificates</DrawerTitle>
      {certificates.flatMap(({ key, certificates: chain }) =>
        chain.map((certificate, index) => {
          const title = chain.length > 1 ? `${key} (${index + 1}/${chain.length})` : key;

          return <CertificateDetails key={`${key}\0${index}`} title={title} certificate={certificate} />;
        }),
      )}
    </>
  );
}
