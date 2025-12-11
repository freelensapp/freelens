# DI Migration Scripts

These scripts help migrate from webpack's `autoRegister` to explicit DI registration.

## Scripts

### 1. generate-explicit-di-registration.mjs

Generates `register-injectables.ts` files for all packages.

```bash
node scripts/generate-explicit-di-registration.mjs
```

**What it does:**
- Scans all packages for `*.injectable.ts` and `*.injectable.tsx` files
- Creates a `register-injectables.ts` file in each package's `src/` directory
- Explicitly imports and registers all injectables

**When to run:**
- Initial migration setup
- After adding new injectable files
- Can be run multiple times (idempotent)

### 2. migrate-feature-files.mjs

Automatically updates `feature.ts` files to use explicit registration.

```bash
node scripts/migrate-feature-files.mjs
```

**What it does:**
- Finds all `feature.ts` files in packages
- Removes `autoRegister` imports and calls
- Adds `registerInjectables` import and call
- Skips files already migrated

**Review changes before committing!**

## Migration Workflow

1. **Generate registration files:**
   ```bash
   node scripts/generate-explicit-di-registration.mjs
   ```

2. **Auto-migrate feature files:**
   ```bash
   node scripts/migrate-feature-files.mjs
   ```

3. **Review changes:**
   ```bash
   git diff
   ```

4. **Test build:**
   ```bash
   pnpm build
   ```

5. **Test application:**
   ```bash
   pnpm start
   ```

6. **Commit if everything works:**
   ```bash
   git add -A
   git commit -m "chore: migrate to explicit DI registration"
   ```

## Manual Steps Still Needed

Some files require manual migration:

1. **Main/Renderer entry points:**
   - `freelens/src/main/index.ts`
   - `freelens/src/renderer/index.ts`

2. **Core package registration:**
   - `packages/core/src/main/register-lens-core.ts`
   - `packages/core/src/renderer/register-lens-core.ts`

3. **Webpack configuration cleanup:**
   - Remove `CONTEXT_MATCHER_FOR_NON_FEATURES` definitions
   - Remove `require.context()` related code

See `docs/DI-MIGRATION-STATUS.md` for detailed steps.

## Troubleshooting

### "Cannot find module './register-injectables'"

Run the generation script first:
```bash
node scripts/generate-explicit-di-registration.mjs
```

### Build errors after migration

1. Check that all `feature.ts` files are migrated
2. Ensure `register-injectables.ts` files are generated
3. Verify no `autoRegister` calls remain:
   ```bash
   grep -r "autoRegister" packages/*/src/
   ```

### Type errors: "DiContainer" vs "DiContainerForInjection"

The `register` function in features receives `DiContainerForInjection`, not `DiContainer`.
The generation script uses the correct type automatically.

## Rollback

To revert the migration:

```bash
git checkout -- packages/
git clean -fd packages/
```

Then restore the dependency:
```bash
pnpm add @ogre-tools/injectable-extension-for-auto-registration
```
