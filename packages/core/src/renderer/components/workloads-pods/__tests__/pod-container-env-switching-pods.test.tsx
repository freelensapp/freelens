/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod, Secret, SecretType } from "@freelensapp/kube-object";
import { base64 } from "@freelensapp/utilities";
import { act } from "@testing-library/react";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import configMapStoreInjectable from "../../config-maps/store.injectable";
import secretStoreInjectable from "../../config-secrets/store.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { ContainerEnvironment } from "../pod-container-env";

import type { RenderResult } from "@testing-library/react";
import type { Mock } from "vitest";

import type { ConfigMapStore } from "../../config-maps/store";
import type { SecretStore } from "../../config-secrets/store";

const makePod = (name: string, secretName: string, configMapName: string) =>
  new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name,
      namespace: "default",
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/default/pods/${name}`,
      uid: `uid-of-${name}`,
    },
    spec: {
      containers: [
        {
          image: "some-image",
          name: "app",
          env: [
            { name: "PASSWORD", valueFrom: { secretKeyRef: { name: secretName, key: "password" } } },
            { name: "SETTING", valueFrom: { configMapKeyRef: { name: configMapName, key: "setting" } } },
          ],
        },
      ],
    },
  });

const makeSecret = (name: string, password: string) =>
  new Secret({
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name,
      namespace: "default",
      resourceVersion: "1",
      selfLink: `/api/v1/namespaces/default/secrets/${name}`,
      uid: `uid-of-${name}`,
    },
    type: SecretType.Opaque,
    data: { password: base64.encode(password) },
  });

describe("<ContainerEnvironment /> when switching to another pod", () => {
  let result: RenderResult;
  let loadConfigMap: Mock;
  const podA = makePod("pod-a", "secret-a", "config-a");
  const podB = makePod("pod-b", "secret-b", "config-b");
  const secrets: Record<string, Secret> = {
    "secret-a": makeSecret("secret-a", "password-of-a"),
    "secret-b": makeSecret("secret-b", "password-of-b"),
  };

  beforeEach(async () => {
    const di = getDiForUnitTesting();

    loadConfigMap = vi.fn().mockResolvedValue(undefined);

    di.override(
      secretStoreInjectable,
      () =>
        ({
          load: vi.fn(async ({ name }: { name: string }) => secrets[name]),
          getByName: vi.fn(),
        }) as Partial<SecretStore> as SecretStore,
    );
    di.override(
      configMapStoreInjectable,
      () => ({ load: loadConfigMap, getByName: vi.fn() }) as Partial<ConfigMapStore> as ConfigMapStore,
    );

    const render = renderFor(di);

    result = render(<ContainerEnvironment pod={podA} container={podA.getContainers()[0]} namespace="default" />);

    await act(async () => {
      result.getByTestId("show-secret-button-for-default/secret-a:password").click();
    });
  });

  it("shows the revealed secret of the first pod", () => {
    expect(result.baseElement).toHaveTextContent("password-of-a");
  });

  it("loads the config map of the first pod", () => {
    expect(loadConfigMap).toHaveBeenCalledWith({ name: "config-a", namespace: "default" });
  });

  describe("when the environment of another pod is rendered", () => {
    beforeEach(async () => {
      result.rerender(<ContainerEnvironment pod={podB} container={podB.getContainers()[0]} namespace="default" />);

      await act(async () => {});
    });

    it("does not show the revealed secret of the first pod", () => {
      expect(result.baseElement).not.toHaveTextContent("password-of-a");
    });

    it("shows the secret of the second pod as hidden", () => {
      expect(result.getByTestId("show-secret-button-for-default/secret-b:password")).toBeInTheDocument();
      expect(result.baseElement).toHaveTextContent("secret(secret-b)[password]");
    });

    it("loads the config map of the second pod", () => {
      expect(loadConfigMap).toHaveBeenCalledWith({ name: "config-b", namespace: "default" });
    });
  });
});
