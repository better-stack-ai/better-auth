# Development Guide

Guide for contributors and maintainers of Better DB.

## Architecture

Better DB is a **thin wrapper** around Better Auth's database layer. This allows us to:

- Reuse battle-tested adapter implementations
- Stay syncable with upstream updates
- Provide a focused, database-only API

### Package Structure

```
packages/btst/
├── db/                   # @btst/db - DSL and types
├── cli/                    # @btst/cli - Schema generation
├── adapter-*/              # @btst/adapter-* - Adapter wrappers
├── plugins/                # @btst/plugins - Common plugins
└── README.md              # Shared across all packages
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

# Build Better Auth (required)
pnpm build --filter better-auth

# Build Better DB packages
pnpm build --filter "@btst/*"

# Run tests
pnpm test --filter "@btst/*"
```

## Key Principles

### 1. Wrapper-First

✅ **DO**: Re-export Better Auth functionality
```typescript
export * from "better-auth/adapters/prisma";
```

❌ **DON'T**: Duplicate Better Auth logic
```typescript
export function createPrismaAdapter(prisma) {
  // reimplemented logic
}
```

### 2. Minimal Changes

Only add what's necessary for the database-focused API. Everything else should be a direct re-export.

### 3. Version Alignment

- Pin to Better Auth versions: `@btst/*@1.4.x` → `better-auth@1.4.x`
- Import from Better Auth internally: `import ... from "better-auth/..."`
- Export as `@btst/*` for users

## Making Changes

### Core (`packages/btst/db/`)

- DSL, types, plugin system
- Ensure compatibility with Better Auth schema format
- Update exports in `src/index.ts`

### Adapters (`packages/btst/adapter-*/`)

- Should only contain re-exports
- Update `src/index.ts` if Better Auth changes exports

### CLI (`packages/btst/cli/`)

- Wraps Better Auth CLI
- Filters auth domain models
- Test with all ORMs (Prisma, Drizzle, Kysely)
- Key files:
  - `src/commands/init.ts` - Schema initialization
  - `src/commands/generate.ts` - Schema generation
  - `src/commands/migrate.ts` - Migration wrapper

### Plugins (`packages/btst/plugins/`)

- Add reusable table definitions
- Follow Better Auth plugin schema format
- Update exports in `src/index.ts`

## Upstream Sync

### Setup

```bash
# One-time: add upstream remote
git remote add upstream https://github.com/better-auth/better-auth.git

# Sync main branch
git fetch upstream
git checkout main
git merge upstream/main
```

### GitHub Actions

Workflows use repository conditionals to prevent conflicts:

**Skip on forks:**
- `release.yml` - npm publishing
- `main-protect.yml` - branch rules
- `preview.yml` - preview builds

**Run on forks:**
- `ci.yml` - tests, builds, linting
- `e2e.yml` - integration tests

**Fork-only:**
- `btst-release.yml` - Publishes `@btst/*` packages
  - Triggered by `btst-v*` tags
  - Uses `if: github.repository != 'better-auth/better-auth'`

### When Better Auth Updates

1. Sync main branch with upstream
2. Review Better Auth changelog for database changes
3. Run integration tests
4. Update any new exports in `@btst/*` packages
5. Bump versions to match Better Auth minor version
6. Test CLI generation

## Testing

```bash
# All tests
pnpm test --filter "@btst/*"

# Specific package
pnpm test --filter "@btst/db"
pnpm test --filter "@btst/cli"

# Manual CLI testing
npx btst init --output=test-schema.ts
npx btst generate --config=test-schema.ts --orm=prisma --yes
```

### Test Coverage

- **Unit**: Field builder, schema transformation, plugin composition
- **Integration**: CLI generation, adapter functionality, field types
- **Compatibility**: Better Auth version compatibility, re-exports

## Release Process

### Automated Release (Recommended)

**Prerequisites:**
- Add `NPM_TOKEN` to GitHub repository secrets

**Method 1: GitHub UI**

1. Update versions:
   ```bash
   cd packages/btst
   pnpm version <major|minor|patch> --workspace
   git add . && git commit -m "chore: bump to v1.x.x" && git push
   ```

2. Create release at `github.com/[user]/better-auth/releases/new`
   - Tag: `btst-v1.4.0`
   - Click "Create new tag on publish"

**Method 2: CLI**

```bash
# Update versions
cd packages/btst
pnpm version <major|minor|patch> --workspace

# Commit and tag
git add . && git commit -m "chore: release v1.4.0"
git push
git tag btst-v1.4.0
git push origin btst-v1.4.0
```

The GitHub Action will automatically:
- Generate changelog
- Build packages
- Copy README to each package
- Publish to npm with correct tag

**Tag Conventions:**
- `btst-v1.4.0` → `latest`
- `btst-v1.4.0-beta.1` → `beta`
- Supported: `alpha`, `beta`, `rc`, `canary`, `next`

### Manual Release

```bash
# Build
pnpm build --filter "@btst/*"

# Publish each package
cd packages/btst/db
pnpm publish --access public --tag latest
# Repeat for cli, plugins, and adapters
```

### Pre-Release Checklist

- [ ] Test with latest Better Auth version
- [ ] Update all package versions consistently
- [ ] Verify clean builds
- [ ] Test CLI with all ORMs
- [ ] Update README if needed
- [ ] Push git tag

## README Management

All `@btst/*` packages share `packages/btst/README.md`:

- During release, README is copied to each package directory
- Each `package.json` includes `"README.md"` in `files` array
- `.gitignore` excludes copied READMEs
- Single source of truth for documentation

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Module resolution errors | Better Auth not built | `pnpm build --filter better-auth` |
| CLI generation failures | Schema format incompatibility | Check `toBetterAuthSchema()` in core |
| Type errors | Missing re-exports | Update type exports in wrappers |

## Contributing

1. Follow wrapper pattern—don't duplicate logic
2. Test with latest Better Auth
3. Keep diffs small for easy syncing
4. Add integration tests
5. Update documentation

## Maintenance

- [ ] Monitor Better Auth releases
- [ ] Keep dependencies aligned
- [ ] Test CLI with latest Better Auth
- [ ] Update docs for API changes
- [ ] Verify adapter re-exports
- [ ] Check integration tests pass
