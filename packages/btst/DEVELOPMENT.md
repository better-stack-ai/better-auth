# Development Guide

Guide for contributors and maintainers of Better DB (`@btst/*`).

## Architecture

Better DB is a **thin wrapper** around Better Auth's database layer. This allows us to:

- Reuse battle-tested adapter implementations
- Stay syncable with upstream updates
- Provide a focused, database-only API

### Package Structure

```
packages/btst/
├── db/                   # @btst/db — defineDb() DSL, types, plugin system
├── cli/                  # @btst/cli — schema generation CLI
├── adapter-drizzle/      # @btst/adapter-drizzle — thin re-export
├── adapter-kysely/       # @btst/adapter-kysely — vendored + wrapped
├── adapter-memory/       # @btst/adapter-memory — thin re-export
├── adapter-mongodb/      # @btst/adapter-mongodb — thin re-export
├── adapter-prisma/       # @btst/adapter-prisma — thin re-export
├── plugins/              # @btst/plugins — reusable table definitions
├── DEVELOPMENT.md        # this file
└── README.md             # shared README (copied to each package on release)
```

### What We Add

- `defineDb()` DSL for schema definition
- Plugin system compatible with Better Auth
- CLI wrapper that filters auth tables
- Type utilities for better DX

Everything else is a direct re-export from Better Auth.

## Development Setup

```bash
# Install dependencies
pnpm install

# Build @btst packages (builds all dependencies automatically)
pnpm turbo build --filter="./packages/btst/*"

# Run tests
pnpm turbo test --filter="./packages/btst/*"
```

> **Note:** Some e2e CLI tests require live Postgres and MySQL connections.
> These only run fully in CI. See [Testing](#testing) for details.

## Key Principles

### 1. Wrapper-First

**DO:** Re-export Better Auth functionality
```typescript
export * from "better-auth/adapters/prisma";
```

**DON'T:** Duplicate Better Auth logic
```typescript
export function createPrismaAdapter(prisma) {
  // reimplemented logic — don't do this
}
```

### 2. Minimal Changes

Only add what's necessary for the database-focused API. Everything else should be a direct re-export.

### 3. Version Alignment

- `@btst/*@2.2.x` tracks `better-auth@1.6.16`
- Minor `@btst` bump = minor `better-auth` bump (1.4→1.5 maps to 2.0→2.1)
- Patch `@btst` bump = patch `better-auth` bump only
- Pin `better-auth`, `@better-auth/core`, and `@better-auth/utils` peers to the
  exact versions in the synced Better Auth release. Better Auth patch releases
  can change shared adapter types, so broad peer ranges can produce duplicate,
  incompatible type universes in consumers.
- Import from Better Auth internally: `import ... from "better-auth/..."`

## Making Changes

### Core (`packages/btst/db/`)

- DSL, types, plugin system
- Ensure compatibility with Better Auth schema format
- Update exports in `src/index.ts`

### Adapters (`packages/btst/adapter-*/`)

Most adapters are **thin re-exports** — they only contain:
```typescript
export * from "better-auth/adapters/prisma";
```

The exception is **`@btst/adapter-kysely`**, which is **vendored** because
`@better-auth/kysely-adapter` is not bundled into the published `better-auth` package.
Its source is synced by `scripts/sync-upstream.ts`.

### CLI (`packages/btst/cli/`)

- Wraps Better Auth CLI generators
- Filters auth domain models out of generated schemas
- Key files:
  - `src/commands/generate.ts` — schema generation command
  - `src/commands/migrate.ts` — migration wrapper
  - `src/generators/index.ts` — generator registry (custom; not synced)
  - `src/generators/drizzle.ts` — synced from upstream
  - `src/generators/prisma.ts` — synced from upstream
  - `src/generators/kysely.ts` — synced from upstream

### Plugins (`packages/btst/plugins/`)

- Add reusable table definitions
- Follow Better Auth plugin schema format
- Update exports in `src/index.ts`

## Upstream Sync

The `scripts/sync-upstream.ts` script copies specific files from upstream into `@btst` packages.
For the full step-by-step runbook, see [WEEKLY-SYNC-UPSTREAM.md](../../WEEKLY-SYNC-UPSTREAM.md).

### What Gets Synced

| Source (monorepo path) | Destination | Notes |
|------------------------|-------------|-------|
| `packages/kysely-adapter/src/` | `packages/btst/adapter-kysely/src/` | Vendored; source moved here in v1.5.4 |
| `packages/cli/src/generators/` | `packages/btst/cli/src/generators/` | drizzle.ts, prisma.ts, kysely.ts, types.ts |
| `packages/cli/src/utils/` | `packages/btst/cli/src/utils/` | get-package-info.ts, helper.ts |

> **v1.5.4 change:** The Kysely adapter was extracted from
> `packages/better-auth/src/adapters/kysely-adapter/` into a standalone
> `packages/kysely-adapter/` package (published as `@better-auth/kysely-adapter`).
> The sync script was updated to point to the new location.

### Running the Sync

```bash
pnpm tsx scripts/sync-upstream.ts
```

The script will print which files it copied and whether import patches were applied.
It **validates all source paths first** and fails with a clear error if any are missing
(which means the upstream restructured something that needs a script update).

### Import Transforms Applied

The sync script applies two categories of transforms:

1. **`@better-auth/core` → published equivalents** (in vendored kysely adapter):
   - `@better-auth/core` → `better-auth/types`
   - `@better-auth/core/db/adapter` → `better-auth/adapters`
   - `@better-auth/core/utils/string` → `./utils/string` (local file in adapter-kysely)

2. **`@better-auth/core/utils/string` → local utility** (in CLI generators):
   - `@better-auth/core/utils/string` → `../utils/string`

Files that received patches are marked with `⚠️ AUTO-GENERATED WITH PATCHES` headers.

### When Better Auth Updates

1. Fetch upstream and check what changed:
   ```bash
   git fetch upstream
   git diff --name-only HEAD..upstream/main -- packages/kysely-adapter/ packages/cli/src/generators/ packages/cli/src/utils/
   ```
2. Merge `upstream/main` and resolve conflicts (accept upstream for all non-btst files)
3. Check if `sync-upstream.ts` source paths still exist — run the script and read errors
4. Update `sync-upstream.ts` if new files were added or paths changed
5. Run `pnpm tsx scripts/sync-upstream.ts`
6. Fix any import issues in `@btst` custom files that reference synced exports (e.g. if a function is renamed)
7. Update snapshot tests: `cd packages/btst/cli && pnpm vitest run -u`
8. Bump all `@btst` versions and `peerDependencies`
9. Build and test: `pnpm turbo build --filter="./packages/btst/*" && pnpm turbo test --filter="./packages/btst/*"`
10. See [WEEKLY-SYNC-UPSTREAM.md](../../WEEKLY-SYNC-UPSTREAM.md) for the full runbook

### `pnpm-workspace.yaml` Catalog

After merging upstream, check that the catalog still includes everything `@btst` packages need.
Upstream sometimes removes catalog entries when they switch build tools. Currently required in the
default catalog that upstream may not include:

- `unbuild` — `@btst` packages use `unbuild` (upstream switched to `tsdown` in v1.5.x)
- `vitest` — listed separately in `catalogs.vitest` by upstream, but `@btst` packages reference the default `catalog:`

If `pnpm install` fails with `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC`, add the missing entry
back to the `catalog:` block in `pnpm-workspace.yaml`.

## Testing

### Test Coverage

- **Unit:** Field builder, schema transformation, plugin composition (`@btst/db`)
- **Integration (local):** CLI generation with SQLite, adapter functionality, field types (`@btst/cli`)
- **E2E (CI only):** CLI generation + migrations with live Postgres and MySQL (`@btst/cli`)
- **Compatibility:** Memory adapter, re-exports (`@btst/adapter-memory`)

### Local Testing

```bash
# All @btst tests (e2e tests will fail without databases — that is expected)
pnpm turbo test --filter="./packages/btst/*"

# Specific packages
pnpm turbo test --filter="@btst/db"
pnpm turbo test --filter="@btst/cli"
pnpm turbo test --filter="@btst/adapter-memory"

# Update snapshots after upstream sync changes generator output
cd packages/btst/cli && pnpm vitest run -u
```

### CI Tests (full suite)

CI (`btst-ci.yml`) runs on every PR touching `packages/btst/**` or `scripts/sync-upstream.ts`.
It provides live Postgres (port 5433) and MySQL (port 3307) for the e2e tests:

```bash
# CI equivalent (requires live databases)
pnpm turbo build --filter="./packages/btst/*"
DATABASE_URL_POSTGRES=postgresql://user:password@localhost:5433/better_auth \
DATABASE_URL_MYSQL=mysql://user:password@localhost:3307/better_auth \
pnpm turbo test --continue --filter="./packages/btst/*"
```

### What Passes Locally vs CI Only

| Test file | Local | CI |
|-----------|-------|----|
| `@btst/db` unit tests | ✅ | ✅ |
| `@btst/adapter-memory` tests | ✅ | ✅ |
| `@btst/cli` schema-conversion.test.ts | ✅ | ✅ |
| `@btst/cli` generate-all-orms.test.ts | ✅ (SQLite) | ✅ (all DBs) |
| `@btst/cli` e2e-cli.test.ts | ❌ (no DB) | ✅ |

## Release Process

### Automated Release (Recommended)

**Prerequisites:** `NPM_TOKEN` in GitHub repository secrets.

1. Bump versions (all 8 packages together):
   ```bash
   # Edit each packages/btst/*/package.json:
   # "version": "2.1.0" (or next version)
   # peerDependencies: "better-auth": "1.6.16"
   # peerDependencies: "@better-auth/utils": "0.4.1"
   ```

2. Commit, push, and tag:
   ```bash
   git add packages/btst/*/package.json
   git commit -m "chore: bump @btst to v2.1.0"
   git push
   git tag btst-v2.1.0
   git push origin btst-v2.1.0
   ```

3. Create a GitHub Release from the `btst-v2.1.0` tag in the GitHub UI.

The `better-db-release.yml` workflow automatically:
- Builds all packages
- Copies README to each package
- Publishes to npm with the correct tag

**Tag → npm tag mapping:**
- `btst-v2.1.0` → `latest`
- `btst-v2.1.0-beta.1` → `beta`
- Supported: `alpha`, `beta`, `rc`, `canary`, `next`

### CLI-only Patch Release

When only `@btst/cli` changes, leave the database, plugin, and adapter package
versions unchanged. Tag the CLI version with the dedicated prefix, then dispatch
the existing trusted-publishing workflow with the `cli` scope:

```bash
git tag btst-cli-v2.2.4
git push origin btst-cli-v2.2.4
gh workflow run better-db-release.yml \
  -f release_tag=btst-cli-v2.2.4 \
  -f release_scope=cli
```

The CLI release plan rejects the cohort `btst-v*` prefix and any manifest other
than `@btst/cli`. The workflow builds dependencies as needed but packs and
publishes only `packages/btst/cli`.

### Manual Release

```bash
pnpm turbo build --filter="./packages/btst/*"

cd packages/btst/db && pnpm publish --access public --tag latest
cd packages/btst/cli && pnpm publish --access public --tag latest
cd packages/btst/plugins && pnpm publish --access public --tag latest
cd packages/btst/adapter-drizzle && pnpm publish --access public --tag latest
cd packages/btst/adapter-kysely && pnpm publish --access public --tag latest
cd packages/btst/adapter-memory && pnpm publish --access public --tag latest
cd packages/btst/adapter-mongodb && pnpm publish --access public --tag latest
cd packages/btst/adapter-prisma && pnpm publish --access public --tag latest
```

### Pre-Release Checklist

- [ ] For cohort releases, all `@btst` package versions bumped consistently
- [ ] For CLI-only releases, only `@btst/cli` version bumped
- [ ] `peerDependencies` version ranges updated
- [ ] `pnpm turbo build --filter="./packages/btst/*"` succeeds with no errors
- [ ] Local tests pass (`pnpm turbo test --filter="./packages/btst/*"`)
- [ ] Snapshot tests updated if generator output changed
- [ ] PR merged to `main`
- [ ] Git tag pushed

## README Management

All `@btst/*` packages share `packages/btst/README.md`:

- During release, the workflow copies it to each package directory
- Each `package.json` includes `"README.md"` in the `files` array
- Single source of truth for documentation

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `pnpm install` fails with `CATALOG_ENTRY_NOT_FOUND` | Upstream removed an entry from `pnpm-workspace.yaml` catalog | Add the missing entry (`unbuild`, `vitest`) back to the `catalog:` block |
| Build fails: `Could not resolve "../utils/string"` | Kysely adapter's `capitalizeFirstLetter` import not resolving | Check `packages/btst/adapter-kysely/src/utils/string.ts` exists |
| Build fails: `X is not exported by "kysely.ts"` | Upstream renamed a generator function | Update `src/generators/index.ts` to use the new name |
| Sync script fails: `Source directory not found` | Upstream restructured a package (e.g. moved kysely adapter) | Update the `from` path in `COPY_CONFIGS` in `scripts/sync-upstream.ts` |
| Snapshot test failures after sync | Generator output changed upstream | Run `cd packages/btst/cli && pnpm vitest run -u` to update snapshots |
| E2E tests fail locally | No live Postgres/MySQL | Expected; only runs fully in CI |

## Contributing

1. Follow wrapper pattern — don't duplicate logic
2. Test with `pnpm turbo test --filter="./packages/btst/*"` before pushing
3. Keep diffs small for easy syncing
4. Add integration tests for new features
5. Update this doc and `WEEKLY-SYNC-UPSTREAM.md` when the sync process changes
