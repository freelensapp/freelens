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

const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * The color format of Monaco's token rules, which is stricter than the editor colors: six or eight
 * digits, the `#` optional.
 */
const tokenColorPattern = /^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const unquotedColorHint =
  "a hex color has to be quoted in YAML: an unquoted # starts a comment and leaves the value empty";

const hexColor = z
  .string({
    error: (issue) =>
      issue.input === null || issue.input === undefined ? `empty color: ${unquotedColorHint}` : "expected a hex color",
  })
  .regex(hexColorPattern, {
    error: (issue) =>
      issue.input === "" ? `empty color: ${unquotedColorHint}` : "expected a hex color: #rgb, #rrggbb or #rrggbbaa",
  });

const tokenColor = z.string().regex(tokenColorPattern, {
  error: "expected a hex color of a token rule: rrggbb or rrggbbaa, with or without #",
});

const buildColorsShape = <Name extends string>(descriptions: Record<Name, string>) =>
  Object.fromEntries(
    Object.entries<string>(descriptions).map(([name, description]) => [
      name,
      hexColor.optional().meta({ description }),
    ]),
  ) as Record<Name, z.ZodOptional<typeof hexColor>>;

const createEditorSchema = (object: typeof z.strictObject) =>
  object({
    base: z
      .enum(["vs", "vs-dark", "hc-black"])
      .meta({ description: "The built-in Monaco theme the editor theme extends" }),
    inherit: z
      .boolean()
      .optional()
      .meta({ description: "Whether the token rules of the base theme apply as well, true when left out" }),
    colors: z
      .record(z.string(), hexColor)
      .optional()
      .meta({ description: "Monaco's editor colors, such as editor.background" }),
    rules: z
      .array(
        object({
          token: z.string().meta({ description: "The token the rule applies to, empty for every token" }),
          foreground: tokenColor.optional(),
          background: tokenColor.optional(),
          fontStyle: z.string().optional().meta({ description: "italic, bold, underline or strikethrough" }),
        }),
      )
      .optional()
      .meta({ description: "Monaco's token rules" }),
  }).meta({ description: "The theme of the code editor, in Monaco's own format" });

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
          .max(63)
          .regex(themeNamePattern, {
            error: "expected lowercase letters, digits and -, starting and ending with a letter or a digit",
          })
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
