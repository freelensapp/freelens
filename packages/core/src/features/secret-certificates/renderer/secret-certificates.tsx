/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { extractCertificateBlocks } from "./extract-certificate-blocks";
import requestSecretCertificatesInjectable from "./request-secret-certificates.injectable";
import { SecretCertificatesSection } from "./secret-certificates-section";

import type { Logger } from "@freelensapp/logger";

import type { SecretCertificateBlocks, SecretKeyCertificates } from "../common/channels";
import type { RequestSecretCertificates } from "./request-secret-certificates.injectable";

export interface SecretCertificatesProps {
  /**
   * The data of a secret: its values base64 encoded, as in `Secret.data`.
   */
  data: Partial<Record<string, string>>;
}

interface Dependencies {
  logger: Logger;
  requestSecretCertificates: RequestSecretCertificates;
}

const NonInjectedSecretCertificates = observer(
  ({ data, logger, requestSecretCertificates }: SecretCertificatesProps & Dependencies) => {
    const [certificates, setCertificates] = useState<SecretKeyCertificates[]>([]);

    // Read during the render, so that an observable `data` edited in place
    // renders again. The blocks are compared by value, so that editing any
    // other value does not request the certificates again.
    const blocksKey = JSON.stringify(extractCertificateBlocks(data));

    useEffect(() => {
      const blocks = JSON.parse(blocksKey) as SecretCertificateBlocks[];

      if (blocks.length === 0) {
        setCertificates([]);

        return undefined;
      }

      // Set when the blocks change again or the component unmounts, so that
      // a response that arrives later is ignored.
      let superseded = false;

      void (async () => {
        let response: SecretKeyCertificates[] = [];

        try {
          response = await requestSecretCertificates(blocks);
        } catch (error) {
          logger.warn("[SecretCertificates]: failed to read the certificates of the secret", error);
        }

        if (!superseded) {
          setCertificates(response);
        }
      })();

      return () => {
        superseded = true;
      };
    }, [blocksKey, logger, requestSecretCertificates]);

    return <SecretCertificatesSection certificates={certificates} />;
  },
);

/**
 * The certificates found in the data of a secret. Only the PEM certificate
 * blocks of the data are sent to the main process, which parses them; the
 * component renders nothing while no value holds a certificate that parses.
 */
export const SecretCertificates = withInjectables<Dependencies, SecretCertificatesProps>(
  NonInjectedSecretCertificates,
  {
    getProps: (di, props) => ({
      ...props,
      logger: di.inject(loggerInjectionToken),
      requestSecretCertificates: di.inject(requestSecretCertificatesInjectable),
    }),
  },
);
