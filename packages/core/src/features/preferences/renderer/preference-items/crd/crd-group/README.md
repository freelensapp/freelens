# YAML Support Implementation for CRD Groups

## Current Status

The current version exclusively uses YAML format for CRD configuration. The implementation now uses the `js-yaml` library to parse YAML files and loads the default configuration from a separate TypeScript file.

## Implementation Details

1. Dependencies:
   - `js-yaml` is used for parsing and generating YAML
   - Default configuration is loaded from the `default-config.ts` file

2. YAML parsing implementation with js-yaml:

   ```typescript
   import * as yaml from 'js-yaml';

   function tryParseYaml(str: string): [any, string | null] {
     try {
       if (!str.trim()) {
         return [{}, null];
       }
       
       const parsed = yaml.load(str);
       
       // Verify it's an object after parsing
       if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
         return [null, "Configuration must be a valid YAML object"];
       }
       
       return [parsed, null];
     } catch (error) {
       if (error instanceof yaml.YAMLException) {
         return [null, `YAML Error: ${error.message}`];
       }
       return [null, `YAML Error: ${error instanceof Error ? error.message : "Invalid format"}`];
     }   }
   ```

3. Default Configuration:

   - Default configuration is defined in a separate file `default-config.ts`
   - This approach improves maintainability and makes future modifications easier
   - The file is cleanly imported into the main component

4. Internal Storage:
   
   - YAML configurations are still converted to JSON for internal storage using `JSON.stringify()`
   - This method ensures compatibility with the existing project architecture

## Current Features

1. Advanced validation of YAML format and data structure
2. Support for nested and complex structures
3. Loading of default configuration from an external file

## Potential Improvements

1. YAML formatting button to improve readability
2. Better visualization of nested structure
3. Preview of CRD groups before saving
