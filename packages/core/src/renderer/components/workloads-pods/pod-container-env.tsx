/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-container-env.scss";

import { cpuUnitsToNumber, metricUnitsToNumber, object, unitsToBytes } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import _ from "lodash";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import configMapStoreInjectable from "../config-maps/store.injectable";
import secretStoreInjectable from "../config-secrets/store.injectable";
import { DrawerItem } from "../drawer";
import { SecretKey } from "./secret-key";

import type { Container, Pod, ResourceRequirements } from "@freelensapp/kube-object";

import type { ConfigMapStore } from "../config-maps/store";
import type { SecretStore } from "../config-secrets/store";

export interface ContainerEnvironmentProps {
  pod: Pod;
  container: Container;
  namespace: string;
}

interface Dependencies {
  configMapStore: ConfigMapStore;
  secretStore: SecretStore;
}

function resolvePodRef(pod: Pod, ref: string) {
  const value = _.get(pod, ref);
  if (Array.isArray(value) && value.every((v) => typeof v === "string" || typeof v === "number")) {
    return value.join(",");
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "object" && v.ip !== undefined)) {
    return value.map((v) => v.ip).join(",");
  }
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return null;
}

function resolveResourcesRef(requirements: ResourceRequirements, ref: string) {
  const path = _.toPath(ref);
  const name = _.last(path);
  const value = _.get(requirements, path);

  if (!name || (typeof value !== "string" && typeof value !== "number")) return NaN;

  if (name.includes("memory") || name.includes("storage")) {
    return unitsToBytes(String(value));
  }

  if (name.includes("cpu")) {
    return _.ceil(cpuUnitsToNumber(String(value)) ?? 0);
  }

  return metricUnitsToNumber(String(value));
}

const NonInjectedContainerEnvironment = observer((props: Dependencies & ContainerEnvironmentProps) => {
  const {
    pod,
    container,
    container: { env, envFrom = [] },
    namespace,
    configMapStore,
    secretStore,
  } = props;

  useEffect(
    () =>
      autorun(() => {
        for (const { valueFrom } of env ?? []) {
          if (valueFrom?.configMapKeyRef?.name) {
            configMapStore.load({ name: valueFrom.configMapKeyRef.name, namespace });
          }
        }

        for (const { configMapRef, secretRef } of envFrom ?? []) {
          if (secretRef?.name) {
            secretStore.load({ name: secretRef.name, namespace });
          }

          if (configMapRef?.name) {
            configMapStore.load({ name: configMapRef.name, namespace });
          }
        }
      }),
    [],
  );

  const renderEnv = () => {
    const orderedEnv = _.sortBy(env, "name");

    return orderedEnv.map((variable) => {
      const { name, value, valueFrom } = variable;
      let secretValue: React.JSX.Element | string | number | null = null;

      if (value) {
        secretValue = value;
      } else if (valueFrom) {
        const { fieldRef, secretKeyRef, configMapKeyRef, resourceFieldRef } = valueFrom;

        if (fieldRef) {
          const { fieldPath } = fieldRef;

          const value = resolvePodRef(pod, fieldPath);
          if (value !== null) {
            secretValue = value;
          } else {
            secretValue = `fieldRef(${fieldPath})`;
          }
        } else if (resourceFieldRef) {
          const { containerName, resource, divisor } = resourceFieldRef;
          const resourceContainer = containerName
            ? pod.getAllContainers().find((c) => c.name === containerName)
            : container;
          if (resourceContainer && resourceContainer.resources) {
            secretValue = _.round(resolveResourcesRef(resourceContainer.resources, resource) / (Number(divisor) || 1));
          }
          if (!secretValue) {
            let divisorInfo = "";
            if (Number(divisor) > 1) {
              divisorInfo = ` / ${divisor}`;
            }
            if (containerName) {
              secretValue = `resourceFieldRef(${containerName}: ${resource}${divisorInfo}))`;
            } else {
              secretValue = `resourceFieldRef(${resource}${divisorInfo}))`;
            }
          }
        } else if (secretKeyRef?.name) {
          secretValue = (
            <SecretKey
              reference={{
                ...secretKeyRef,
                name: secretKeyRef.name,
              }}
              namespace={namespace}
            />
          );
        } else if (configMapKeyRef?.name) {
          const { name, key } = configMapKeyRef;
          const configMap = configMapStore.getByName(name, namespace);
          if (configMap && configMap.data[key] !== undefined) {
            secretValue = configMap.data[key];
          } else {
            secretValue = `configMapKeyRef(${name})[${key}])`;
          }
        }
      }

      return (
        <div className="variable" key={name}>
          <span className="var-name">{name}</span>
          {` : `}
          {secretValue}
        </div>
      );
    });
  };

  const renderEnvFrom = () =>
    envFrom.flatMap(({ configMapRef, secretRef, prefix }) => {
      if (configMapRef?.name) {
        return renderEnvFromConfigMap(configMapRef.name, prefix);
      }

      if (secretRef?.name) {
        return renderEnvFromSecret(secretRef.name, prefix);
      }

      return null;
    });

  const renderEnvFromConfigMap = (configMapName: string, prefix: string | undefined) => {
    const configMap = configMapStore.getByName(configMapName, namespace);

    if (!configMap) return null;

    return object.entries(configMap.data).map(([name, value]) => (
      <div className="variable" key={name}>
        <span className="var-name">
          {prefix}
          {name}
        </span>
        {` : `}
        {value}
      </div>
    ));
  };

  const renderEnvFromSecret = (secretName: string, prefix: string | undefined) => {
    const secret = secretStore.getByName(secretName, namespace);

    if (!secret) return null;

    return Object.keys(secret.data).map((key) => (
      <div className="variable" key={key}>
        <span className="var-name">
          {prefix}
          {key}
        </span>
        {` : `}
        <SecretKey
          reference={{
            name: secret.getName(),
            key,
          }}
          namespace={namespace}
        />
      </div>
    ));
  };

  return (
    <DrawerItem name="Environment" className="ContainerEnvironment">
      {env && renderEnv()}
      {envFrom && renderEnvFrom()}
    </DrawerItem>
  );
});

export const ContainerEnvironment = withInjectables<Dependencies, ContainerEnvironmentProps>(
  NonInjectedContainerEnvironment,
  {
    getProps: (di, props) => ({
      ...props,
      configMapStore: di.inject(configMapStoreInjectable),
      secretStore: di.inject(secretStoreInjectable),
    }),
  },
);
