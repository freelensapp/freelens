/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { nodeEnvInjectionToken } from "../../common/vars/node-env-injection-token";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import userPreferenceDescriptorsInjectable from "./common/preference-descriptors.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { PreferenceDescriptors } from "./common/preference-descriptors.injectable";

// The global override of user-info sets the home directory to /some-home-dir.
const kubeDirectoryPath = "/some-home-dir/.kube";

describe("default of the kubeconfig syncs", () => {
  let di: DiContainer;
  let descriptor: PreferenceDescriptors["syncKubeconfigEntries"];

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  describe("in production mode", () => {
    beforeEach(() => {
      di.override(nodeEnvInjectionToken, () => "production");
      descriptor = di.inject(userPreferenceDescriptorsInjectable).syncKubeconfigEntries;
    });

    it("syncs ~/.kube when nothing is stored", () => {
      expect([...descriptor.fromStore(undefined).keys()]).toEqual([kubeDirectoryPath]);
    });

    it("stores nothing for ~/.kube alone", () => {
      expect(descriptor.toStore(descriptor.fromStore([{ filePath: kubeDirectoryPath }]))).toBeUndefined();
    });

    it("stores an empty list", () => {
      expect(descriptor.toStore(descriptor.fromStore([]))).toEqual([]);
    });

    it("keeps an empty list empty on reload", () => {
      expect(descriptor.fromStore(descriptor.toStore(descriptor.fromStore([]))).size).toBe(0);
    });

    it("stores other entries", () => {
      expect(descriptor.toStore(descriptor.fromStore([{ filePath: "/some-kubeconfig" }]))).toEqual([
        { filePath: "/some-kubeconfig" },
      ]);
    });
  });

  describe("in development mode", () => {
    beforeEach(() => {
      di.override(nodeEnvInjectionToken, () => "development");
      descriptor = di.inject(userPreferenceDescriptorsInjectable).syncKubeconfigEntries;
    });

    it("syncs nothing when nothing is stored", () => {
      expect(descriptor.fromStore(undefined).size).toBe(0);
    });

    it("stores ~/.kube alone", () => {
      expect(descriptor.toStore(descriptor.fromStore([{ filePath: kubeDirectoryPath }]))).toEqual([
        { filePath: kubeDirectoryPath },
      ]);
    });

    it("keeps ~/.kube alone on reload", () => {
      const stored = descriptor.toStore(descriptor.fromStore([{ filePath: kubeDirectoryPath }]));

      expect([...descriptor.fromStore(stored).keys()]).toEqual([kubeDirectoryPath]);
    });

    it("stores nothing for an empty list", () => {
      expect(descriptor.toStore(descriptor.fromStore([]))).toBeUndefined();
    });

    it("stores other entries", () => {
      expect(descriptor.toStore(descriptor.fromStore([{ filePath: "/some-kubeconfig" }]))).toEqual([
        { filePath: "/some-kubeconfig" },
      ]);
    });
  });
});
