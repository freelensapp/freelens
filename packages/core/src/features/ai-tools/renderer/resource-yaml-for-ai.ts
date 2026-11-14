/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as yaml from "js-yaml";
import { defaultYamlDumpOptions } from "../../../common/kube-helpers";

const redacted = "<redacted>";
const sensitiveName = /(pass(word|wd)?|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential|auth)/i;
const droppedAnnotations = ["kubectl.kubernetes.io/last-applied-configuration"];

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Replaces the values of environment variables whose names look like
 * credentials, in every container list of a pod spec found in `value`.
 */
const redactSensitiveEnv = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(redactSensitiveEnv);

    return;
  }

  if (!isPlain(value)) {
    return;
  }

  if (Array.isArray(value.env)) {
    for (const variable of value.env) {
      if (
        isPlain(variable) &&
        typeof variable.name === "string" &&
        "value" in variable &&
        sensitiveName.test(variable.name)
      ) {
        variable.value = redacted;
      }
    }
  }

  for (const child of Object.values(value)) {
    redactSensitiveEnv(child);
  }
};

/**
 * The manifest of a resource as it goes into an AI prompt: without the
 * fields that are noise for diagnosis, and with values that are likely to be
 * credentials replaced by `<redacted>`.
 */
export const sanitizeResourceForAi = (kind: string, value: Plain): Plain => {
  const resource = structuredClone(value);

  if (isPlain(resource.metadata)) {
    const metadata = resource.metadata;

    delete metadata.managedFields;

    if (isPlain(metadata.annotations)) {
      for (const annotation of droppedAnnotations) {
        delete metadata.annotations[annotation];
      }
    }
  }

  if (kind === "Secret") {
    for (const field of ["data", "stringData"]) {
      const values = resource[field];

      if (isPlain(values)) {
        resource[field] = Object.fromEntries(Object.keys(values).map((key) => [key, redacted]));
      }
    }
  }

  if (kind === "ConfigMap") {
    for (const field of ["data", "binaryData"]) {
      const values = resource[field];

      if (isPlain(values)) {
        resource[field] = Object.fromEntries(
          Object.entries(values).map(([key, entry]) => [key, sensitiveName.test(key) ? redacted : entry]),
        );
      }
    }
  }

  redactSensitiveEnv(resource.spec);

  return resource;
};

export const resourceYamlForAi = (kind: string, value: Plain) =>
  yaml.dump(sanitizeResourceForAi(kind, value), defaultYamlDumpOptions);

/**
 * YAML typed in an editor. Parsed and sanitized like a stored resource when it
 * parses, so that a Secret being edited does not leak; returned as written
 * otherwise, because invalid YAML is often what the user wants explained.
 */
export const editorYamlForAi = (text: string) => {
  try {
    const parsed = yaml.load(text);

    if (isPlain(parsed)) {
      return resourceYamlForAi(typeof parsed.kind === "string" ? parsed.kind : "", parsed);
    }
  } catch {
    // Fall through: send the text as typed, the prompt-wide redaction still applies.
  }

  return text;
};
