/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as yaml from "js-yaml";
import { makeAutoObservable } from "mobx";
import { findOptimalDefaultContainer } from "../../../renderer/components/dock/logs/default-container-helper";
import { debugContainerSpecError, debugUnavailableReason } from "../common/debug-container";

import type { EphemeralContainer, Pod } from "@freelensapp/kube-object";

import type { DebugContainerSpec, DebugProfile } from "../common/debug-container";

export interface DebugDialogDependencies {
  getDefaultImage: () => string;
  randomId: () => string;
  openTerminal: (spec: DebugContainerSpec) => void;
}

export const initialDebugEnv = "# NAME: value\n";
export const initialDebugCustom = [
  "# A partial container spec that kubectl merges into the debug container, for example:",
  "# command: [sleep, infinity]",
  "# securityContext:",
  "#   runAsUser: 0",
  "",
].join("\n");

type Parsed<T> = { value: T; error?: undefined } | { value?: undefined; error: string };

const isMapping = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseYamlMapping(text: string, what: string): Parsed<Record<string, unknown> | undefined> {
  try {
    // Unlike `load`, `loadAll` accepts a text of only comments, which leaves the field unset.
    const documents = yaml.loadAll(text);

    if (documents.length > 1) return { error: `The ${what} must be a single document.` };
    const value = documents[0];

    if (value === undefined || value === null) return { value: undefined };
    if (!isMapping(value)) return { error: `The ${what} must be a mapping.` };

    return { value };
  } catch (error) {
    return { error: `The ${what} is not valid YAML: ${(error as Error).message.split("\n")[0]}` };
  }
}

export class DebugContainerDialogState {
  pod: Pod | undefined;
  container = "";
  image = "";
  target = "";
  profile: DebugProfile | "" = "";
  env = initialDebugEnv;
  custom = initialDebugCustom;

  constructor(private readonly dependencies: DebugDialogDependencies) {
    makeAutoObservable<this, "dependencies">(this, { dependencies: false }, { autoBind: true });
  }

  get parsedEnv(): Parsed<string[]> {
    const { value, error } = parseYamlMapping(this.env, "environment");

    if (error !== undefined) return { error };

    return {
      value: Object.entries(value ?? {}).map(
        ([name, envValue]) =>
          `${name}=${typeof envValue === "string" ? envValue : envValue === null ? "" : JSON.stringify(envValue)}`,
      ),
    };
  }

  get parsedCustom(): Parsed<string | undefined> {
    const { value, error } = parseYamlMapping(this.custom, "custom container spec");

    if (error !== undefined) return { error };

    return { value: value ? this.custom : undefined };
  }

  get spec(): DebugContainerSpec | undefined {
    if (!this.pod) return undefined;

    return {
      namespace: this.pod.getNs(),
      pod: this.pod.getName(),
      podUid: this.pod.getId(),
      container: this.container,
      image: this.image.trim(),
      target: this.target,
      profile: this.profile || undefined,
      env: this.parsedEnv.value ?? [],
      custom: this.parsedCustom.value,
    };
  }

  get error(): string | undefined {
    if (!this.pod) return "Select a pod.";

    return (
      debugUnavailableReason(this.pod) ??
      this.parsedEnv.error ??
      this.parsedCustom.error ??
      debugContainerSpecError(this.spec ?? {})
    );
  }

  open(pod: Pod) {
    this.pod = pod;
    this.container = `freelens-debug-${this.dependencies.randomId()}`;
    this.image = this.dependencies.getDefaultImage();
    this.target = findOptimalDefaultContainer(pod.getContainers(), pod.metadata.annotations)?.name ?? "";
    this.profile = "general";
    this.env = initialDebugEnv;
    this.custom = initialDebugCustom;
  }

  set<K extends "image" | "target" | "profile" | "env" | "custom">(field: K, value: this[K]) {
    this[field] = value;
  }

  close() {
    this.pod = undefined;
  }

  /**
   * Opens a terminal attached to an ephemeral container that runs. The tab finds it in the pod and
   * attaches rather than creating it, so only its identity matters.
   */
  attach(pod: Pod, container: EphemeralContainer) {
    this.dependencies.openTerminal({
      namespace: pod.getNs(),
      pod: pod.getName(),
      podUid: pod.getId(),
      container: container.name,
      image: container.image ?? "",
      target: container.targetContainerName ?? pod.getContainers()[0]?.name ?? "",
    });
  }

  start() {
    const spec = this.spec;

    if (!spec || this.error) return;
    this.dependencies.openTerminal(spec);
    this.close();
  }
}
