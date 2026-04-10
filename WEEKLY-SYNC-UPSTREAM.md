# Weekly Upstream Sync

**Goal:** Sync our fork of `better-auth/better-auth` with the latest upstream release, vendor updated files into `@btst/*` packages, bump versions, and publish.

---

## Context

- **Our fork:** `git@github.com:olliethedev/better-auth.git` (`origin`)
- **Upstream:** `https://github.com/better-auth/better-auth.git` — tracked as `upstream` remote (already configured)
- **Our packages:** all live under `packages/btst/` — upstream never touches this directory, so **there are no btst-specific merge conflicts**

### What we own (never accept upstream's version for these)

| Path | Description |
|------|-------------|
| `packages/btst/` | All 8 `@btst/*` packages — our entire product |
| `scripts/sync-upstream.ts` | File-copy script that vendors upstream files into `@btst` |
| `README.md` | Fork-specific README |
| `.github/workflows/better-db-release.yml` | Our npm publish workflow |
| `.github/workflows/btst-ci.yml` | Our CI workflow |
| `packages/btst/DEVELOPMENT.md` | Our contributor guide |
| `packages/btst/README.md` | Shared `@btst` package README |

### What `sync-upstream.ts` vendors

The sync script vendors files from upstream standalone adapter packages into `@btst`. All adapters are vendored (not thin re-exports) to ensure `@btst` always gets the full-featured standalone adapter implementations with all upstream fixes:

| Source (in this monorepo) | Destination | Notes |
|---------------------------|-------------|-------|
| `packages/drizzle-adapter/src/` | `packages/btst/adapter-drizzle/src/` | Full drizzle adapter implementation |
| `packages/prisma-adapter/src/` | `packages/btst/adapter-prisma/src/` | Full prisma adapter implementation |
| `packages/memory-adapter/src/` | `packages/btst/adapter-memory/src/` | Full memory adapter implementation |
| `packages/mongo-adapter/src/` | `packages/btst/adapter-mongodb/src/` | Full mongodb adapter implementation |
| `packages/kysely-adapter/src/` | `packages/btst/adapter-kysely/src/` | Kysely adapter with import patches (`@better-auth/core/utils` → local utility) |
| `packages/cli/src/generators/` | `packages/btst/cli/src/generators/` | Drizzle, Prisma, Kysely schema generators |
| `packages/cli/src/utils/` | `packages/btst/cli/src/utils/` | Package detection utility and helpers |

---

## Steps

### 0. Check for a new upstream tag

**We only sync when a new stable upstream tag has been released.** Do not sync against `upstream/main` directly — only sync against a specific release tag.

```bash
git fetch upstream --tags

# List the latest upstream tags (most recent first)
git tag --list --sort=-version:refname | head -20
```

Compare against the last tag we synced. For example, if the last sync was `v1.5.0`, look for any `v1.5.x` or `v1.6.x` tag that is newer.

**Important:** Skip any pre-release / beta tags (e.g. `v1.6.0-beta.1`). We only sync stable releases.

If there is no newer stable tag than the one we last synced, **stop here** — there is nothing to sync this week.

Record the new tag you will sync to (e.g. `TAG=v1.5.4`) — you will use it in subsequent steps.

### 1. Create a sync branch

Always work on a branch, not directly on `main`:

```bash
TAG=v1.5.4   # replace with the actual new tag
git checkout main
git pull origin main
git checkout -b sync-upstream-${TAG}
# e.g. sync-upstream-v1.5.4
```

### 2. Preview changes introduced by the new tag

```bash
# Commits between our HEAD and the upstream tag
git log --oneline HEAD..${TAG} | head -30

# Files changed between our HEAD and the upstream tag
git diff --name-only HEAD..${TAG} | grep -v "^packages/btst/" | head -40

# Check the adapter and CLI paths specifically (these drive step 4)
git diff --name-only HEAD..${TAG} -- packages/kysely-adapter/ packages/cli/src/generators/ packages/cli/src/utils/
```

### 3. Merge the upstream tag

```bash
git merge ${TAG} --no-edit
```

This will produce **many conflicts** — that is normal. The vast majority are in docs, demos, and upstream packages that we simply accept as-is.

### 4. Resolve conflicts

Use the following strategy for each conflict type:

**a) Files upstream deleted (`UD` conflicts) — remove them:**

```bash
git status --short | grep "^UD" | awk '{print $2}' | xargs git rm -f
```

**b) Binary or asset conflicts (`AU` where only we added) — keep ours:**

```bash
git checkout --ours <file> && git add <file>
```

**c) `README.md` — keep ours (fork-specific content):**

```bash
git checkout --ours README.md && git add README.md
```

**d) Everything else outside `packages/btst/` — accept upstream:**

```bash
# List all remaining content conflicts
git diff --name-only --diff-filter=U | grep -v "^README.md$" > /tmp/conflicts.txt

# Accept upstream for all of them
xargs git checkout --theirs < /tmp/conflicts.txt
xargs git add < /tmp/conflicts.txt
```

**e) Verify no conflicts remain:**

```bash
git diff --name-only --diff-filter=U
# Should output nothing
```

**f) Commit the merge:**

```bash
git commit -m "chore: merge upstream better-auth ${TAG}"
```

### 5. Check if `sync-upstream.ts` needs updating

Before running the sync script, verify the source paths it references still exist in the newly merged code:

```bash
pnpm tsx scripts/sync-upstream.ts 2>&1 | head -20
```

If you see `❌ Source directory not found` or `❌ Source file not found`, the upstream structure changed. Common changes to watch for:

- **New files added to any adapter** — check each vendored adapter's source directory for new `.ts` files not listed in its `files` array. For example, if `query-builders.ts` appears in `packages/drizzle-adapter/src/` and the adapter now imports it, add it to the corresponding `COPY_CONFIGS` entry. After a sync, a build error like `Cannot find module './query-builders'` is a sign a new file was missed.
  ```bash
  # Check each adapter for new files vs what sync-upstream.ts lists:
  ls packages/drizzle-adapter/src/ packages/prisma-adapter/src/ \
     packages/memory-adapter/src/ packages/mongo-adapter/src/ \
     packages/kysely-adapter/src/ packages/cli/src/generators/ \
     packages/cli/src/utils/
  ```
- **Adapter directory location changed** — if an adapter moves (e.g. kysely moved from `packages/better-auth/src/adapters/kysely-adapter/` to `packages/kysely-adapter/src/` in v1.5.4), update the `from` path in `COPY_CONFIGS`.
- **Import path changes** — if upstream changes an internal import (e.g. `@better-auth/core/utils` → `@better-auth/core/utils/string`), update the `transformImports` regex in the relevant config block.

See the `COPY_CONFIGS` array in `scripts/sync-upstream.ts` for the exact paths and transforms being applied.

### 6. Run the sync script

```bash
pnpm tsx scripts/sync-upstream.ts
```

Expected output:

```
🔄 Syncing upstream files to @btst packages...
✅ All source files found
📦 packages/kysely-adapter/src → adapter-kysely/src/
  kysely-adapter.ts   ✨ Patches applied
  ...
📦 packages/cli/src/generators → generators/
  ...
✅ Sync complete! Copied N files.
```

Review the generated files briefly — the script adds a `⚠️ AUTO-GENERATED` header to each file so they're easy to identify.

### 7. Bump `@btst/*` versions

All 8 packages under `packages/btst/` should be bumped together:

- **Minor bump** (e.g. `2.1.0` → `2.2.0`) for new routes, new `@btst` features, or meaningful additions — whether alongside an upstream sync or as a fork-only change
- **Patch bump** (e.g. `2.1.0` → `2.1.1`) for a pure upstream sync with no new `@btst` additions, or for a fork-only fix/small tweak with no new functionality

Note: `@btst` versioning is independent of upstream's version scheme. An upstream minor release does **not** automatically mandate a minor `@btst` bump — what matters is whether *our* packages gain new functionality.

Edit each `packages/btst/*/package.json` and update `"version"`. Also update any `peerDependencies` referencing `"better-auth"` to reflect the new minimum version (e.g. `">=1.4.0"` → `">=1.5.0"`) when syncing a minor upstream release.

Packages to update:
- `packages/btst/db/package.json`
- `packages/btst/cli/package.json`
- `packages/btst/plugins/package.json`
- `packages/btst/adapter-drizzle/package.json`
- `packages/btst/adapter-kysely/package.json`
- `packages/btst/adapter-memory/package.json`
- `packages/btst/adapter-mongodb/package.json`
- `packages/btst/adapter-prisma/package.json`

### 8. Build `better-auth` first, then `@btst/*`

The `@btst` packages depend on `better-auth` via `workspace:*`, so build order matters:

```bash
pnpm build --filter better-auth
pnpm build --filter "@btst/*"
```

All builds must succeed with no errors before proceeding.

### 9. Run all CI checks and fix failures

This step mirrors exactly what `ci.yml` and `btst-ci.yml` run on the PR. Run every check locally and fix all failures before pushing. Do not skip any step — all of these ran in CI and failures blocked the last sync.

#### 9a. Upstream CI checks (`ci.yml`)

```bash
# Build everything first
pnpm build

# Biome lint (formatting + code style)
pnpm lint

# Knip — unused exports / dead code across the whole monorepo
pnpm lint:dependencies

# Per-package knip checks (turbo)
pnpm lint:packages

# Spell check (cspell)
pnpm lint:spell

# Docs markdown format check
pnpm format:check

# TypeScript type checking per-package
pnpm lint:types

# Full monorepo typecheck
pnpm typecheck

# Dist declaration typecheck
pnpm typecheck:dist
```

**Common failures and fixes:**

- **`pnpm lint` fails** — Biome formatting/lint errors in `@btst` vendored files. The sync script adds an auto-generated header that can break linting if the source file had trailing newlines or other issues. Run `pnpm lint:fix` on the failing files or manually fix the reported errors.

- **`pnpm lint:packages` / `pnpm lint:dependencies` fails (knip)** — Knip reports unused exports or files. After a sync, adapters may export symbols that `knip.jsonc` didn't know about. Fix by:
  1. Adding the entry to the `ignore` or `ignoreDependencies` array in `knip.jsonc`, **or**
  2. Removing the unused export from the `@btst` adapter's `index.ts` if it was mistakenly added.
  
  Also check `packages/btst/adapter-kysely/package.json` and `packages/btst/db/package.json` — if they declare `exports` that reference non-existent files, knip will complain.

- **`pnpm lint:spell` fails (cspell)** — New words introduced by upstream (library names, technical terms, author names). Add them to the correct file:
  - `.cspell/tech-terms.txt` — technical terms, library names, acronyms
  - `.cspell/names.txt` — author names or proper nouns
  - `.cspell/custom-words.txt` — domain-specific words

- **`pnpm lint:types` / `pnpm typecheck` fails** — Type errors in `@btst` packages after a sync. Common causes:
  - Missing type dependency: add it to the adapter's `package.json` `devDependencies` and run `pnpm install`
  - Wrong `tsconfig.json` reference: each `packages/btst/*/tsconfig.json` should extend `../../tsconfig.base.json`, not a path that no longer exists
  - New upstream export types that reference packages not in `@btst` deps

#### 9b. BTST CI checks (`btst-ci.yml`)

```bash
# Build @btst packages
pnpm turbo build --filter="./packages/btst/*"

# Typecheck @btst packages
pnpm --filter "@btst/*" exec tsc --noEmit

# Run @btst tests (SQLite-only tests pass locally; Postgres/MySQL tests need CI)
pnpm turbo test --continue --filter="./packages/btst/*"
```

**Expected result on a developer machine (no local databases):**

- `@btst/db` tests — all pass
- `@btst/adapter-memory` tests — all pass
- `@btst/cli` `schema-conversion.test.ts` — all pass
- `@btst/cli` `generate-all-orms.test.ts` — all pass (uses SQLite)
- `@btst/cli` `e2e-cli.test.ts` — **fails** (needs live Postgres + MySQL — CI only)

The e2e failures are expected locally. CI provides the databases.

If `generate-all-orms.test.ts` has **snapshot failures**, update them — this means the generators produce slightly different output in the new version (normal for a minor upstream bump):

```bash
cd packages/btst/cli && pnpm vitest run -u
```

Commit the updated snapshots as part of the sync PR.

### 10. Commit and open a PR

```bash
git add -A
git commit -m "chore: sync upstream ${TAG} + bump @btst to vY.Y.Y"
git push -u origin HEAD
# then open a PR → main
```

### 11. Release (after PR is merged)

The GitHub Action `better-db-release.yml` publishes all `@btst/*` packages automatically when a GitHub Release is published with a `btst-v*` tag:

```bash
# After PR is merged to main:
git checkout main && git pull
git tag btst-vY.Y.Y
git push origin btst-vY.Y.Y
# Then create a GitHub Release from that tag in the GitHub UI
```

Tag convention: `btst-v2.1.0` → published as `latest`

---

## Caveats & Pro-tips

- **`packages/btst/` never conflicts with upstream** — upstream has no knowledge of this directory. Git will never touch these files during a merge. Any changes in this directory between syncs are purely our own.

- **`pnpm-lock.yaml` always conflicts** — it's a large generated file that both sides modify independently. Always accept upstream's version (`git checkout --theirs pnpm-lock.yaml`) then run `pnpm install` to update it with our workspace entries.

- **`UD` conflicts need `git rm`, not `--theirs`** — when upstream deletes a file that we modified, `git checkout --theirs` fails because "their" version doesn't exist. You must use `git rm -f <file>` instead.

- **`scripts/sync-upstream.ts` may need updating between major/minor releases** — upstream occasionally restructures packages. Always validate the script runs cleanly (step 5) before trusting its output. The script itself will fail early and tell you exactly which source path is missing.

- **The `transformImports` regexes in `sync-upstream.ts` track internal upstream import paths** — if upstream reorganises its own internals (e.g. `@better-auth/core/utils` became `@better-auth/core/utils/string` in v1.5.4), the regex must be updated to match the new path, or the vendored files will have broken imports that fail at build time.

- **`d1-sqlite-dialect.ts` was added in v1.5.4** — if the kysely adapter gains new files in future releases, check `packages/kysely-adapter/src/` after the merge and add any new files to the `files` array in `sync-upstream.ts`.

- **Docs conflicts are noise** — the `docs/` directory changes every release (new MDX pages, sidebar changes, component restructures). Always accept upstream's version; we don't host the docs.

- **Upstream sometimes deletes GitHub Actions workflows** — in v1.5.4, `adapter-tests.yml`, `auto-cherry-pick-to-main.yml`, and `cherry-pick-to-main.yml` were removed. Accept those deletions. Our fork-only workflows (`better-db-release.yml`, `btst-ci.yml`) are not in conflict because upstream doesn't have them.

- **`pnpm-workspace.yaml` catalog entries may disappear** — upstream removes catalog entries when they switch build tools. In v1.5.4, `unbuild` and `vitest` (default catalog) were removed because upstream switched to `tsdown` and moved vitest to a named sub-catalog. Our `@btst` packages still need them. If `pnpm install` fails with `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC`, add the missing entry back to the `catalog:` block in `pnpm-workspace.yaml` and re-run.

- **New utility files in synced directories need to be added to `sync-upstream.ts`** — in v1.5.4, `helper.ts` was added to `packages/cli/src/utils/` and immediately imported by `get-package-info.ts`. Because it wasn't in the `files` list, the build failed. After a sync, if the build complains about a missing module in a synced path, check whether upstream added a new file that needs to be added to the relevant `COPY_CONFIGS` entry.

- **Renamed exports in synced files cascade to our custom code** — `generateMigrations` was renamed to `generateKyselySchema` in the upstream CLI generators in v1.5.4. Our custom `generators/index.ts` and CLI commands referenced the old name and needed updating. After a sync, always check the build output for `"X is not exported by Y"` errors.

- **Check the upstream changelog before syncing** — scan `https://github.com/better-auth/better-auth/releases` for anything database or adapter related. New adapter exports, new CLI flags, or changed field types may require updates to `@btst` package wrappers beyond what the sync script handles automatically.

- **Versioning note** — `@btst/*` uses its own version scheme independent of `better-auth`. Minor bumps are driven by new `@btst` functionality (new routes, features, additions), not by upstream's release cadence. Patch bumps cover pure upstream syncs and fork-only fixes with no new functionality. This is documented in `packages/btst/DEVELOPMENT.md`.

- **`@btst` tsconfig files must extend the base** — each `packages/btst/*/tsconfig.json` must have `"extends": "../../tsconfig.base.json"` (two levels up, relative to the package dir). If `pnpm --filter "@btst/*" exec tsc --noEmit` reports `Cannot find tsconfig base`, check that `packages/btst/tsconfig.base.json` exists and all package tsconfigs point to it correctly.

- **All adapters are now vendored, not re-exports** — as of the v1.6.x sync, `sync-upstream.ts` vendors all five adapters (drizzle, prisma, memory, mongodb, kysely) from their standalone upstream packages. If you see a `@btst` adapter `index.ts` that re-exports from `better-auth/adapters/...` instead of from a local vendored file, update it to import from the vendored file. The upstream standalone packages receive fixes that may not make it into `better-auth`'s built-in adapters.

- **New adapter source files break the build silently** — when upstream adds a new file to an adapter (e.g. `query-builders.ts` in drizzle/memory/mongodb adapters in v1.6.x), the vendored copy won't have it and the build will fail with `Cannot find module`. After each sync, check `packages/*-adapter/src/` for files not yet listed in `sync-upstream.ts COPY_CONFIGS` and add them. Then re-run the sync script.

- **ALL workflow files use upstream's private runner** — after merging upstream, any workflow that has `runs-on: starsling-ubuntu-24.04` (upstream's self-hosted runner) will queue forever in our fork. Replace it in every workflow file at once:
  ```bash
  sed -i 's/runs-on: starsling-ubuntu-24\.04/runs-on: ubuntu-latest/g' \
    .github/workflows/*.yml
  ```
  This covers `ci.yml`, `e2e.yml`, and any new workflows upstream added in the release (e.g. `auto-changeset.yml`, `promote.yml`, `verify-changesets.yml`, etc.).

- **`preview.yml` should be deleted** — upstream's docs preview workflow (`preview.yml`) is only meaningful inside the upstream org (it previously had an `if: github.repository == 'better-auth/better-auth'` guard). After a merge where upstream removes that guard, the workflow will try to run in our fork and fail. Delete it since we don't host the docs:
  ```bash
  rm -f .github/workflows/preview.yml
  git rm -f .github/workflows/preview.yml 2>/dev/null || true
  ```
