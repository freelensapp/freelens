/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import type { EnvVarKeySelector } from "@freelensapp/kube-object";
import { base64, cssNames, isObject } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import React, { useState } from "react";
import type { SetRequired } from "type-fest";
import type { SecretStore } from "../config-secrets/store";
import secretStoreInjectable from "../config-secrets/store.injectable";

export interface SecretKeyProps {
  reference: SetRequired<EnvVarKeySelector, "name">;
  namespace: string;
}

interface Dependencies {
  secretStore: SecretStore;
}

const NonInjectedSecretKey = (props: SecretKeyProps & Dependencies) => {
  const {
    reference: { name, key },
    namespace,
    secretStore,
  } = props;

  const [loading, setLoading] = useState(false);
  const [secretData, setSecretData] = useState<string>();

  if (!name) {
    return null;
  }

  const showKey = async (evt: React.MouseEvent) => {
    evt.preventDefault();
    setLoading(true);

    try {
      const secret = await secretStore.load({ name, namespace });

      try {
        setSecretData(base64.decode(secret.data[key] ?? ""));
      } catch {
        setSecretData(secret.data[key]);
      }
    } catch (error) {
      if (error instanceof Error) {
        setSecretData(`${error}`);
      } else if (isObject(error)) {
        setSecretData(`Error: ${JSON.stringify(error)}`);
      } else {
        setSecretData(`Error: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (secretData) {
    return <>{secretData}</>;
  }

  return (
    <>
      {`secret(${name})[${key}]`}
      &nbsp;
      <Icon
        className={cssNames("secret-button", { loading })}
        material="visibility"
        tooltip="Show"
        disabled={loading}
        onClick={showKey}
        data-testid={`show-secret-button-for-${namespace}/${name}:${key}`}
      />
    </>
  );
};

export const SecretKey = withInjectables<Dependencies, SecretKeyProps>(NonInjectedSecretKey, {
  getProps: (di, props) => ({
    ...props,
    secretStore: di.inject(secretStoreInjectable),
  }),
});
