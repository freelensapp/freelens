/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./secret-details.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { Secret } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import type { ShowCheckedErrorNotification, ShowNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { base64, toggle } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { autorun, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Input } from "../input";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { SecretStore } from "./store";
import secretStoreInjectable from "./store.injectable";

export interface SecretDetailsProps extends KubeObjectDetailsProps<Secret> {}

interface Dependencies {
  secretStore: SecretStore;
  logger: Logger;
  showSuccessNotification: ShowNotification;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedSecretDetails extends React.Component<SecretDetailsProps & Dependencies> {
  @observable isSaving = false;
  @observable data: Partial<Record<string, string>> = {};
  @observable revealSecret = observable.set<string>();

  constructor(props: SecretDetailsProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      autorun(() => {
        const { object: secret } = this.props;

        if (secret) {
          this.data = secret.data;
          this.revealSecret.clear();
        }
      }),
    ]);
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
        <div className="flex gaps align-center">
          <Input
            multiLine
            theme="round-black"
            className="box grow"
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
      </div>
    );
  }
}

export const SecretDetails = withInjectables<Dependencies, SecretDetailsProps>(NonInjectedSecretDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
    secretStore: di.inject(secretStoreInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
