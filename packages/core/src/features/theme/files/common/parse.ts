/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as yaml from "js-yaml";
import { getUnknownTokens, themeApiVersion, themeFileSchema, themeKind, themeSchemaUrl } from "./schema";

import type { z } from "zod";

import type { ThemeFile } from "./schema";

export type ParseThemeFileResult =
  | {
      isValid: true;
      theme: ThemeFile;
      /**
       * The tokens the application does not know, which it ignores.
       */
      unknownTokens: string[];
    }
  | {
      isValid: false;
      error: string;
    };

const formatPath = (path: readonly PropertyKey[]) =>
  path.map((segment) => (typeof segment === "number" ? `[${segment}]` : String(segment))).join(".");

interface ThemeFileIssue {
  path: PropertyKey[];
  message: string;
}

const isTypeMismatch = (issues: readonly z.core.$ZodIssue[]) =>
  issues.length === 1 && issues[0].code === "invalid_type" && issues[0].path.length === 0;

/**
 * The issues of a parse, with a union, such as the style of an editor token, replaced by the issues
 * of the one option whose type the value has: a style with an unquoted, so empty, `foreground` is
 * reported at `keyword.foreground`, not as a value that is neither a color nor a style.
 */
const flattenIssues = (issues: readonly z.core.$ZodIssue[], prefix: readonly PropertyKey[] = []): ThemeFileIssue[] =>
  issues.flatMap((issue) => {
    const path = [...prefix, ...issue.path];

    if (issue.code === "invalid_union") {
      const options: readonly (readonly z.core.$ZodIssue[])[] = issue.errors;
      const matching = options.filter((optionIssues) => !isTypeMismatch(optionIssues));

      if (matching.length === 1) {
        return flattenIssues(matching[0], path);
      }
    }

    return [{ path, message: issue.message }];
  });

/**
 * Parses a theme file, YAML or JSON, and validates it. Never throws: an invalid file gives the
 * reason, which the preferences show.
 */
export const parseThemeFile = (content: string): ParseThemeFileResult => {
  let documents: unknown[];

  try {
    documents = yaml.loadAll(content);
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (documents.length !== 1) {
    return {
      isValid: false,
      error:
        documents.length === 0
          ? "The file is empty"
          : `The file holds ${documents.length} YAML documents: a theme file holds a single one`,
    };
  }

  const [document] = documents;

  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return { isValid: false, error: "The file is not a theme: expected a mapping at the top level" };
  }

  const { apiVersion, kind } = document as Record<string, unknown>;

  // Checked before the schema, so that a file of another format, or of a later version, gets a
  // message about that rather than a list of everything that does not match.
  if (apiVersion !== themeApiVersion) {
    return {
      isValid: false,
      error: `Unsupported apiVersion ${JSON.stringify(apiVersion ?? null)}: expected "${themeApiVersion}"`,
    };
  }

  if (kind !== themeKind) {
    return {
      isValid: false,
      error: `Unsupported kind ${JSON.stringify(kind ?? null)}: expected "${themeKind}"`,
    };
  }

  const result = themeFileSchema.safeParse(document);

  if (!result.success) {
    return {
      isValid: false,
      error: flattenIssues(result.error.issues)
        .map((issue) => (issue.path.length > 0 ? `${formatPath(issue.path)}: ${issue.message}` : issue.message))
        .join("\n"),
    };
  }

  return {
    isValid: true,
    theme: result.data,
    unknownTokens: getUnknownTokens(result.data),
  };
};

/**
 * Writes a theme file as YAML, with the modeline that points the YAML language server at the JSON
 * Schema. Every string is quoted, so that no color can turn into a comment.
 */
export const serializeThemeFile = (theme: ThemeFile): string => {
  const { $schema: _schema, ...rest } = theme;
  const body = yaml.dump(rest, {
    forceQuotes: true,
    quoteStyle: "double",
    lineWidth: -1,
    noRefs: true,
  });

  return `# yaml-language-server: $schema=${themeSchemaUrl}\n${body}`;
};
