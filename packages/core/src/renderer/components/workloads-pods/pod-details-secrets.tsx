/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-details-secrets.scss";

import type { SecretApi } from "@freelensapp/kube-api";
import { secretApiInjectable } from "@freelensapp/kube-api-specifics";
import type { Pod, Secret } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import { reaction } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";

export interface PodDetailsSecretsProps {
  pod: Pod;
}

interface Dependencies {
  secretApi: SecretApi;
  getDetailsUrl: GetDetailsUrl;
}

const NonInjectedPodDetailsSecrets = observer((props: PodDetailsSecretsProps & Dependencies) => {
  const { pod, secretApi, getDetailsUrl } = props;
  const [secrets, setSecrets] = useState(new Map<string, Secret>());

  useEffect(
    () =>
      reaction(
        () => pod.getSecrets(),
        (secretNames) => {
          void (async () => {
            const results = await Promise.allSettled(
              secretNames.map((secretName) =>
                secretApi.get({
                  name: secretName,
                  namespace: pod.getNs(),
                }),
              ),
            );

            setSecrets(
              new Map(
                results
                  .filter((result) => result.status === "fulfilled" && result.value)
                  .map((result) => (result as PromiseFulfilledResult<Secret>).value)
                  .map((secret) => [secret.getName(), secret]),
              ),
            );
          })();
        },
        {
          fireImmediately: true,
        },
      ),
    [],
  );

  const renderSecret = (name: string) => {
    const secret = secrets.get(name);

    if (!secret) {
      return <span key={name}>{name}</span>;
    }

    return (
      <Link key={secret.getId()} to={getDetailsUrl(secret.selfLink)}>
        {secret.getName()}
      </Link>
    );
  };

  return <div className="PodDetailsSecrets">{pod.getSecrets().map(renderSecret)}</div>;
});

export const PodDetailsSecrets = withInjectables<Dependencies, PodDetailsSecretsProps>(NonInjectedPodDetailsSecrets, {
  getProps: (di, props) => ({
    ...props,
    secretApi: di.inject(secretApiInjectable),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
  }),
});
