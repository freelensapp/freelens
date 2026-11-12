/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./secret-details.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { Secret } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { showCheckedErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { base64, toggle } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { autorun, compareStructural, observable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { extractCertificateBlocks } from "../../../features/secret-certificates/renderer/extract-certificate-blocks";
import requestSecretCertificatesInjectable from "../../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import { SecretCertificatesSection } from "../../../features/secret-certificates/renderer/secret-certificates";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Input } from "../input";
import secretStoreInjectable from "./store.injectable";

import type { Logger } from "@freelensapp/logger";
import type { ShowCheckedErrorNotification, ShowNotification } from "@freelensapp/notifications";

import type {
  SecretCertificateBlocks,
  SecretCertificates,
} from "../../../features/secret-certificates/common/channels";
import type { RequestSecretCertificates } from "../../../features/secret-certificates/renderer/request-secret-certificates.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { SecretStore } from "./store";

export interface SecretDetailsProps extends KubeObjectDetailsProps<Secret> {}

interface Dependencies {
  secretStore: SecretStore;
  logger: Logger;
  showSuccessNotification: ShowNotification;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
  requestSecretCertificates: RequestSecretCertificates;
}

@observer
class NonInjectedSecretDetails extends React.Component<SecretDetailsProps & Dependencies> {
  private readonly disposers: (() => void)[] = [];
  @observable accessor isSaving = false;
  @observable accessor data: Partial<Record<string, string>> = {};
  @observable accessor revealSecret = observable.set<string>();
  @observable accessor certificates: SecretCertificates[] = [];

  /**
   * Counts the certificate requests, so that a response that arrives after a
   * newer request, or after the panel has closed or moved on to another
   * secret, is ignored.
   */
  private certificatesRequest = 0;

  constructor(props: SecretDetailsProps & Dependencies) {
    super(props);
  }

  componentDidMount() {
    // Capture the object before the autorun: mobx-react 9 forbids reading
    // this.props inside a derivation (the autorun below).
    const { object: secret } = this.props;

    this.disposers.push(
      autorun(() => {
        if (secret) {
          this.data = secret.data;
          this.revealSecret.clear();
        }
      }),
      // The certificate blocks are compared rather than the data, so that
      // editing any other value does not request the certificates again.
      reaction(
        () => extractCertificateBlocks(this.data),
        (blocks) => this.requestCertificates(blocks),
        { equals: compareStructural, fireImmediately: true },
      ),
    );
  }

  componentWillUnmount() {
    this.disposers.forEach((dispose) => dispose());
    this.certificatesRequest += 1;
  }

  requestCertificates(blocks: SecretCertificateBlocks[]) {
    const request = ++this.certificatesRequest;

    if (blocks.length === 0) {
      this.certificates = [];

      return;
    }

    void (async () => {
      let certificates: SecretCertificates[] = [];

      try {
        certificates = await this.props.requestSecretCertificates(blocks);
      } catch (error) {
        this.props.logger.warn("[SecretDetails]: failed to read the certificates of the secret", error);
      }

      if (request === this.certificatesRequest) {
        runInAction(() => {
          this.certificates = certificates;
        });
      }
    })();
  }

  saveSecret = () => {
    const { object: secret } = this.props;

    void (async () => {
      this.isSaving = true;

      try {
        await this.props.secretStore.update(secret, { ...secret, data: this.data });
        this.props.showSuccessNotification("Secret successfully updated.");
      } catch (err) {
        this.props.showCheckedErrorNotification(err, "Unknown error occurred while updating the secret");
      }
      this.isSaving = false;
    })();
  };

  editData = (name: string, value: string, encoded: boolean) => {
    this.data[name] = encoded ? value : base64.encode(value);
  };

  renderSecret = ([name, value]: [string, string | undefined]) => {
    let decodedVal: string | undefined;

    try {
      decodedVal = value ? base64.decode(value) : undefined;
    } catch {
      /**
       * The value failed to be decoded, so don't show the visibility
       * toggle until the value is saved
       */
      this.revealSecret.delete(name);
    }

    const revealSecret = this.revealSecret.has(name);

    if (revealSecret && typeof decodedVal === "string") {
      value = decodedVal;
    }

    return (
      <div key={name} className="data" data-testid={`${name}-secret-entry`}>
        <div className="name">{name}</div>
        <div className="flex gap-2 items-center">
          <Input
            multiLine
            theme="round-black"
            className="grow shrink-0 basis-0"
            value={value || ""}
            onChange={(value) => this.editData(name, value, !revealSecret)}
          />
          {typeof decodedVal === "string" && (
            <Icon
              material={revealSecret ? "visibility" : "visibility_off"}
              tooltip={revealSecret ? "Hide" : "Show"}
              onClick={() => toggle(this.revealSecret, name)}
            />
          )}
        </div>
      </div>
    );
  };

  renderData() {
    const secrets = Object.entries(this.data);

    if (secrets.length === 0) {
      return null;
    }

    return (
      <>
        <DrawerTitle>Data</DrawerTitle>
        {secrets.map(this.renderSecret)}
        <Button primary label="Save" waiting={this.isSaving} className="save-btn" onClick={this.saveSecret} />
      </>
    );
  }

  render() {
    const { object: secret, logger } = this.props;

    if (!secret) {
      return null;
    }

    if (!(secret instanceof Secret)) {
      logger.error("[SecretDetails]: passed object that is not an instanceof Secret", secret);

      return null;
    }

    return (
      <div className="SecretDetails">
        <DrawerItem name="Type">{secret.type}</DrawerItem>
        {this.renderData()}
        <SecretCertificatesSection certificates={this.certificates} />
      </div>
    );
  }
}

export const SecretDetails = withInjectables<Dependencies, SecretDetailsProps>(NonInjectedSecretDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
    requestSecretCertificates: di.inject(requestSecretCertificatesInjectable),
    secretStore: di.inject(secretStoreInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
