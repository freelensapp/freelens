/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { makeAutoObservable, runInAction } from "mobx";
import { debugPodReference, debugUnavailableReason, defaultDebugImage } from "../common/debug-container";

import type { PodApi } from "@freelensapp/kube-api";
import type { Pod } from "@freelensapp/kube-object";

import type { DebugContainerPermissions, DebugContainerReference } from "../common/debug-container";
import type { DebugContainerClient } from "./client.injectable";

export interface DebugDialogDependencies {
  client: DebugContainerClient;
  podApi: Pick<PodApi, "get">;
  randomId: () => string;
  openShell: (reference: DebugContainerReference) => void;
  delay: () => Promise<void>;
}

export class DebugContainerDialogState {
  pod: Pod | undefined;
  image = defaultDebugImage;
  targetContainerName = "";
  containerName = "";
  permissions: DebugContainerPermissions | undefined;
  busy = false;
  submitted = false;
  status = "";
  error = "";
  private generation = 0;

  constructor(private readonly dependencies: DebugDialogDependencies) {
    makeAutoObservable<this, "dependencies" | "generation">(
      this,
      { dependencies: false, generation: false },
      { autoBind: true },
    );
  }

  get disabledReason() {
    if (!this.pod) return "Select a pod.";
    const reason = debugUnavailableReason(this.pod);

    if (reason) return reason;
    if (!this.permissions) return "Checking permissions ...";
    if (!this.permissions.create || !this.permissions.exec) {
      return "Debugging requires permission to add ephemeral containers and execute commands in pods.";
    }
    if (!this.targetContainerName) return "Select a target container.";
    if (!/^\S+$/.test(this.image) || this.image.length > 1024) return "Enter a valid image reference without spaces.";
    return undefined;
  }

  async open(pod: Pod) {
    const generation = ++this.generation;

    this.pod = pod;
    this.targetContainerName = pod.getContainers()[0]?.name ?? "";
    this.containerName = `freelens-debug-${this.dependencies.randomId()}`;
    this.permissions = undefined;
    this.busy = false;
    this.submitted = false;
    this.status = "";
    this.error = "";
    try {
      const permissions = await this.dependencies.client.permissions(pod.getNs());

      runInAction(() => {
        if (generation === this.generation) this.permissions = permissions;
      });
    } catch (error) {
      runInAction(() => {
        if (generation === this.generation) this.error = errorMessage(error);
      });
    }
  }

  close() {
    this.generation++;
    this.pod = undefined;
    this.busy = false;
  }

  setImage(image: string) {
    if (!this.submitted) this.image = image;
  }

  setTargetContainer(name: string) {
    if (!this.submitted) this.targetContainerName = name;
  }

  async start() {
    if (!this.pod || this.busy || this.disabledReason) return;
    const generation = this.generation;
    const reference = { ...debugPodReference(this.pod), containerName: this.containerName };

    this.busy = true;
    this.submitted = true;
    this.error = "";
    this.status = "Adding debug container ...";
    try {
      await this.dependencies.client.create({
        ...reference,
        image: this.image,
        targetContainerName: this.targetContainerName,
      });
      for (let attempt = 0; attempt < 120; attempt++) {
        if (generation !== this.generation) return;
        const pod = await this.dependencies.podApi.get({ namespace: reference.namespace, name: reference.name });

        if (generation !== this.generation) return;
        if (!pod || pod.getId() !== reference.uid) throw new Error("The pod was deleted or replaced.");
        const status = pod.status?.ephemeralContainerStatuses?.find(
          (container) => container.name === reference.containerName,
        );

        if (status?.state?.running) {
          this.dependencies.openShell(reference);
          this.close();
          return;
        }
        if (status?.state?.terminated) {
          throw new Error(
            `Debug container exited: ${status.state.terminated.reason ?? "unknown reason"}. Check its logs; the image needs sh, sleep, and a writable /tmp.`,
          );
        }
        runInAction(() => {
          this.status =
            status?.state?.waiting?.message ||
            status?.state?.waiting?.reason ||
            "Waiting for the debug container to start ...";
        });
        await this.dependencies.delay();
      }
      throw new Error(
        `Startup timed out. ${this.status} The container remains in the pod; you can reconnect when it starts.`,
      );
    } catch (error) {
      runInAction(() => {
        if (generation === this.generation) this.error = errorMessage(error);
      });
    } finally {
      runInAction(() => {
        if (generation === this.generation) this.busy = false;
      });
    }
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
}
