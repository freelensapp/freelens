/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { z } from "zod";
import {
  lensColorDescriptions,
  lensColorNames,
  terminalColorDescriptions,
  terminalColorNames,
} from "./token-descriptions";

import type { LensColorName, TerminalColorName } from "../../../../renderer/themes/lens-theme";

export const themeApiVersion = "freelens.app/v1";
export const themeKind = "Theme";

/**
 * The URL of the JSON Schema of `freelens.app/v1` theme files. The file behind it is
 * `schemas/theme-v1.schema.json` of the repository, generated from {@link themeFileJsonSchemaSource}.
 */
export const themeSchemaUrl =
  "https://raw.githubusercontent.com/freelensapp/freelens/main/schemas/theme-v1.schema.json";

export type ThemeVariantName = "dark" | "light";

export const themeVariantNames: readonly ThemeVariantName[] = ["dark", "light"];

export const themeNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export const themeNameMaxLength = 63;

const themeNameRule = "expected lowercase letters, digits and -, starting and ending with a letter or a digit";

/**
 * Why a value cannot be the name of a theme, or `undefined` when it can. An imported theme is
 * stored as `<name>.yaml`, so the main process checks every name that comes from outside it before
 * it touches the file system.
 */
export const getThemeNameError = (name: unknown): string | undefined => {
  if (typeof name !== "string") {
    return "The name of a theme must be a string";
  }

  if (name.length > themeNameMaxLength || !themeNamePattern.test(name)) {
    return `${JSON.stringify(name)} is not a theme name: ${themeNameRule}, at most ${themeNameMaxLength} characters`;
  }

  return undefined;
};

const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * The colors of the editor's tokens take six or eight digits, as Monaco's token rules do.
 */
const tokenColorPattern = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const unquotedColorHint =
  "a hex color has to be quoted in YAML: an unquoted # starts a comment and leaves the value empty";

const emptyColorMessage = `empty color: ${unquotedColorHint}`;

const isEmpty = (input: unknown) => input === null || input === undefined;

const createColorSchema = (pattern: RegExp, formats: string) =>
  z
    .string({
      error: (issue) => (isEmpty(issue.input) ? emptyColorMessage : "expected a hex color"),
    })
    .regex(pattern, {
      error: (issue) => (issue.input === "" ? emptyColorMessage : `expected a hex color: ${formats}`),
    });

const hexColor = createColorSchema(hexColorPattern, "#rgb, #rrggbb or #rrggbbaa");

const tokenColor = createColorSchema(tokenColorPattern, "#rrggbb or #rrggbbaa");

const buildColorsShape = <Name extends string>(descriptions: Record<Name, string>) =>
  Object.fromEntries(
    Object.entries<string>(descriptions).map(([name, description]) => [
      name,
      hexColor.optional().meta({ description }),
    ]),
  ) as Record<Name, z.ZodOptional<typeof hexColor>>;

const tokenStyleMessage = "expected a hex color, or an object with foreground, background and fontStyle";

const createEditorSchema = (object: typeof z.strictObject) => {
  const tokenStyle = object({
    foreground: tokenColor.optional(),
    background: tokenColor.optional(),
    fontStyle: z
      .string()
      .optional()
      .meta({ description: "italic, bold, underline or strikethrough, several of them separated by spaces" }),
  });

  return object({
    base: z
      .enum(["vs", "vs-dark", "hc-black", "hc-light"])
      .optional()
      .meta({ description: "The built-in Monaco theme the editor theme extends; the built-in theme's when left out" }),
    inherit: z
      .boolean()
      .optional()
      .meta({ description: "Whether the token styles of the base apply as well; the built-in theme's when left out" }),
    colors: z.record(z.string(), hexColor).optional().meta({
      description: "Monaco's editor colors, such as editor.background; missing ones come from the built-in theme",
    }),
    tokens: z
      .record(
        z.string(),
        // A null value is an unquoted color: neither option takes it, so the union explains it.
        z.union([tokenColor, tokenStyle], {
          error: (issue) => (isEmpty(issue.input) ? emptyColorMessage : tokenStyleMessage),
        }),
      )
      .optional()
      .meta({
        description:
          "The style of each token, by Monaco's token name (empty for every token): a color, which is the " +
          "foreground, or foreground, background and fontStyle; missing ones come from the built-in theme",
      }),
  }).meta({ description: "The theme of the code editor" });
};

const createThemeFileSchema = (strict: boolean) => {
  // Outside the tokens, the application drops the fields it does not know rather than refusing
  // the file, for the same reason.
  const object = strict ? z.strictObject : (z.object as typeof z.strictObject);
  const colorsShape = buildColorsShape<LensColorName>(lensColorDescriptions);
  const terminalColorsShape = buildColorsShape<TerminalColorName>(terminalColorDescriptions);

  // The application ignores unknown tokens, so that a theme written for a newer Freelens still
  // loads; the JSON Schema rejects them, so that an editor marks a typo while the file is written.
  const colors = (strict ? z.strictObject(colorsShape) : z.looseObject(colorsShape)).meta({
    description: "The colors of the application; missing ones are taken from the built-in theme",
  });
  const terminalColors = (strict ? z.strictObject(terminalColorsShape) : z.looseObject(terminalColorsShape)).meta({
    description: "The colors of the terminal; missing ones are taken from the built-in theme",
  });

  const variantSchema = object({
    colors: colors.optional(),
    terminalColors: terminalColors.optional(),
    editor: createEditorSchema(object).optional(),
  });
  // The id puts the variant once into the $defs of the JSON Schema, which both variants refer to.
  // Ids live in a global registry, so only one of the two schemas can have it.
  const variant = strict ? variantSchema.meta({ id: "ThemeVariant" }) : variantSchema;

  const spec = object({
    displayName: z.string().trim().min(1).meta({ description: "The name shown in the preferences" }),
    description: z.string().optional(),
    author: z.string().optional(),
    dark: variant.optional().meta({ description: "The dark variant of the theme" }),
    light: variant.optional().meta({ description: "The light variant of the theme" }),
  }).refine((value) => value.dark !== undefined || value.light !== undefined, {
    error: "a theme needs a dark variant, a light variant or both",
  });

  return {
    spec,
    file: object({
      $schema: z.string().optional().meta({ description: "The URL of this JSON Schema, for editors" }),
      apiVersion: z.literal(themeApiVersion),
      kind: z.literal(themeKind),
      metadata: object({
        name: z
          .string()
          .max(themeNameMaxLength)
          .regex(themeNamePattern, { error: themeNameRule })
          .meta({ description: "The identifier of the theme, which the preferences store" }),
        labels: z.record(z.string(), z.string()).optional(),
        annotations: z.record(z.string(), z.string()).optional(),
      }),
      spec,
    }),
  };
};

const lenientSchema = createThemeFileSchema(false);

/**
 * The schema the application validates theme files with. It keeps unknown color tokens, which
 * {@link getUnknownTokens} lists and the resolution of a variant leaves out.
 */
export const themeFileSchema = lenientSchema.file;

/**
 * The strict schema the JSON Schema is generated from. It differs from {@link themeFileSchema} only
 * in rejecting unknown color tokens.
 */
export const themeFileJsonSchemaSource = createThemeFileSchema(true);

export type ThemeFile = z.infer<typeof themeFileSchema>;
export type ThemeVariantSpec = NonNullable<ThemeFile["spec"]["dark"]>;
export type ThemeEditorSpec = NonNullable<ThemeVariantSpec["editor"]>;
export type ThemeEditorTokens = NonNullable<ThemeEditorSpec["tokens"]>;

/**
 * The JSON Schema of theme files, generated from the strict zod schema, so that the two cannot
 * drift apart.
 */
export const getThemeFileJsonSchema = () => {
  const { file, spec } = themeFileJsonSchemaSource;

  const jsonSchema = z.toJSONSchema(file, {
    target: "draft-2020-12",
    override: (context) => {
      // A refinement has no JSON Schema form, so the rule it checks is written out.
      if (context.zodSchema === spec) {
        context.jsonSchema.anyOf = [{ required: ["dark"] }, { required: ["light"] }];
      }
    },
  });

  return {
    $schema: jsonSchema.$schema,
    $id: themeSchemaUrl,
    title: "Freelens theme",
    description: `A Freelens theme file, apiVersion ${themeApiVersion}`,
    ...jsonSchema,
  };
};

/**
 * The tokens of a theme file that the application does not know, as `dark.colors.name` paths.
 */
export const getUnknownTokens = (theme: ThemeFile): string[] => {
  const unknown: string[] = [];
  const known = {
    colors: new Set<string>(lensColorNames),
    terminalColors: new Set<string>(terminalColorNames),
  };

  for (const variantName of themeVariantNames) {
    const variant = theme.spec[variantName];

    if (!variant) {
      continue;
    }

    for (const group of ["colors", "terminalColors"] as const) {
      for (const token of Object.keys(variant[group] ?? {})) {
        if (!known[group].has(token)) {
          unknown.push(`${variantName}.${group}.${token}`);
        }
      }
    }
  }

  return unknown;
};
