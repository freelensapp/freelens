import type { ValidatingWebhookConfiguration } from "@freelensapp/kube-object";
import { observer } from "mobx-react";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { WebhookConfig } from "../config-mutating-webhook-configurations/webhook-config";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface ValidatingWebhookProps extends KubeObjectDetailsProps<ValidatingWebhookConfiguration> {}

@observer
export class ValidatingWebhookDetails extends React.Component<ValidatingWebhookProps> {
  render() {
    const { object: webhookConfig } = this.props;

    return (
      <div className="ValidatingWebhookDetails">
        <DrawerItem name="API version">{webhookConfig.apiVersion}</DrawerItem>
        <DrawerTitle>Webhooks</DrawerTitle>
        {webhookConfig.getWebhooks()?.length == 0 && <div style={{ opacity: 0.6 }}>No webhooks set</div>}
        {webhookConfig.getWebhooks()?.map((webhook) => (
          <WebhookConfig webhook={webhook} key={webhook.name} />
        ))}
      </div>
    );
  }
}
