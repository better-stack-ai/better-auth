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

The sync script copies three groups of files from upstream into `@btst`:

| Source (in this monorepo) | Destination | Notes |
|---------------------------|-------------|-------|
| `packages/kysely-adapter/src/` | `packages/btst/adapter-kysely/src/` | Vendored because `@better-auth/kysely-adapter` is a peer dep, not bundled by `better-auth` |
| `packages/cli/src/generators/` | `packages/btst/cli/src/generators/` | Drizzle, Prisma, Kysely schema generators |
| `packages/cli/src/utils/get-package-info.ts` | `packages/btst/cli/src/utils/` | Package detection utility |

All other adapters (`prisma`, `drizzle`, `memory`, `mongodb`) are thin re-exports — they update automatically with the `better-auth` version bump and need no vendoring.

---

## Steps

### 1. Create a sync branch

Always work on a branch, not directly on `main`:

```bash
git checkout main
git pull origin main
git checkout -b sync-upstream-$(date +%b-%d | tr '[:upper:]' '[:lower:]')
# e.g. sync-upstream-mar-9
```

### 2. Fetch upstream and preview changes

```bash
git fetch upstream

# Commits we're missing from upstream
git log --oneline HEAD..upstream/main | head -30

# Files changed in upstream since our last sync
git diff --name-only HEAD..upstream/main | grep -v "^packages/btst/" | head -40

# Check the adapter and CLI paths specifically (these drive step 4)
git diff --name-only HEAD..upstream/main -- packages/kysely-adapter/ packages/cli/src/generators/ packages/cli/src/utils/
```

### 3. Merge upstream

```bash
git merge upstream/main --no-edit
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
git commit -m "chore: merge upstream better-auth vX.X.X"
```

### 5. Check if `sync-upstream.ts` needs updating

Before running the sync script, verify the source paths it references still exist in the newly merged code:

```bash
pnpm tsx scripts/sync-upstream.ts 2>&1 | head -20
```

If you see `❌ Source directory not found` or `❌ Source file not found`, the upstream structure changed. Common changes to watch for:

- **Kysely adapter location** — in v1.5.4 it moved from `packages/better-auth/src/adapters/kysely-adapter/` to `packages/kysely-adapter/src/`. Update the `from` path in `COPY_CONFIGS` inside `scripts/sync-upstream.ts`.
- **New files added** — if upstream adds new files to a vendored directory (e.g. `d1-sqlite-dialect.ts` was added in v1.5.4), add them to the `files` array in the relevant config block.
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

- **Minor bump** (e.g. `2.0.x` → `2.1.0`) when upstream does a minor release (`1.4.x` → `1.5.x`)
- **Patch bump** (e.g. `2.1.0` → `2.1.1`) for upstream patch releases only

Edit each `packages/btst/*/package.json` and update `"version"`. Also update any `peerDependencies` referencing `"better-auth"` to reflect the new minimum version (e.g. `">=1.4.0"` → `">=1.5.0"` for a minor release).

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

### 9. Run `@btst` tests and verify

Run the test suite locally to catch any remaining issues:

```bash
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
git commit -m "chore: sync upstream vX.X.X + bump @btst to vY.Y.Y"
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

Tag conventions:
- `btst-v2.1.0` → published as `latest`
- `btst-v2.1.0-beta.1` → published as `beta`

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

- **Versioning note** — `@btst/*` uses its own version scheme independent of `better-auth`. The current pattern: minor `@btst` bumps align with minor `better-auth` bumps (`better-auth@1.5.x` → `@btst@2.1.x`). This is documented in `packages/btst/DEVELOPMENT.md`.

- **`ci.yml` and `e2e.yml` use upstream's private runner** — after merging upstream, `ci.yml` and `e2e.yml` will reference `runs-on: starsling-ubuntu-24.04`, a self-hosted runner registered only in the upstream org. Jobs on this runner will queue forever in our fork. Always replace every `starsling-ubuntu-24.04` with `ubuntu-latest` in both files after the merge:
  ```bash
  sed -i 's/runs-on: starsling-ubuntu-24\.04/runs-on: ubuntu-latest/g' \
    .github/workflows/ci.yml .github/workflows/e2e.yml
  ```
