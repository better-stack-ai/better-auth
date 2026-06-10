# Better Auth Development Guide

This is the Better Auth repository - a comprehensive authentication framework for TypeScript, designed to be runtime and framework-agnostic.

## Project Structure

- `packages/better-auth` - Main authentication library
- `packages/core` - Shared core types and utilities
- `packages/cli` - CLI tool
- `packages/*` - Database adapters, plugins, integrations
- `docs/` - Documentation site (Next.js + Fumadocs), content in `docs/content/docs/`
- `test/` - Shared test workspace
- `e2e/` - End-to-end tests (smoke, adapter, integration)
- `demo/` - Example apps

## Commands

- ALWAYS use `pnpm` (never npm, yarn, or bun)
- NEVER run `pnpm test` (runs all packages). Use `vitest path/to/test -t <pattern>`
- Type check: `pnpm typecheck`
- Formatting/linting runs automatically on commit (Lefthook + Biome). No need to run manually.

## Writing Code

- Must work across Node.js, Bun, Deno, and Cloudflare Workers. Avoid runtime-specific APIs.
- Biome (tabs for code, 2 spaces for JSON)
- NEVER use `any`. NEVER use classes.
- Use `Uint8Array` instead of `Buffer` (except in tests)
- Import zod as `import * as z from "zod"`
- Use `import type` for type-only imports
- Use `node:` protocol for Node.js built-ins (e.g. `node:crypto`)
- JSDoc comments for public APIs
- Plugins should be as independent as possible. When working on a plugin, prefer modifying the plugin over changing core.

## Testing

- Most tests use Vitest; some under `e2e/` use Playwright
- Use `getTestInstance()` from `better-auth/test`. It returns `{ client, auth, sessionSetter, ... }`
- Pass client plugins via `clientOptions.plugins`
- NEVER create separate clients with `createAuthClient()` in tests
- Default test DB is SQLite in-memory; use `testWith` for other databases
- Adapter tests need Docker: `docker compose up -d`
- Regression tests: add `@see` comment with issue URL above `it()` or `describe()`:
  ```typescript
  /**
   * @see https://github.com/better-auth/better-auth/issues/{issue_number}
   */
  it("should handle the previously broken behavior", async () => {
    // ...
  });
  ```

## Important Development Notes

- Bug fixes and new features MUST include tests
- For bug fixes: if the issue is reproducible in a test, write a failing test first, then implement the fix
- Update docs (`docs/content/docs/`) when changing public API
- Ensure `pnpm typecheck` passes before finishing
- DO NOT COMMIT unless the user explicitly asks
- Conventional Commits: `feat(scope):`, `fix(scope):`, `docs:`, `chore:`. Use `!` for breaking changes (e.g. `feat(auth)!:`)
- PRs target `main`

## Cursor Cloud specific instructions

### Environment

- **Node.js 24** (per `.nvmrc`), managed via nvm
- **pnpm 10.30.2** (per `packageManager` in root `package.json`), activated via corepack
- **Docker** is available and should be started for full test coverage (`sudo dockerd &>/tmp/dockerd.log &` then `docker compose up -d`)

### Key commands

See `CLAUDE.md` for coding conventions and `CONTRIBUTING.md` for full setup docs. Quick reference:

- **Install:** `pnpm install`
- **Build all packages:** `pnpm build` (runs `turbo build --filter=./packages/*`)
- **Dev watch mode:** `pnpm dev --concurrency=20` (19 persistent tasks require concurrency > 10)
- **Lint:** `pnpm lint` (Biome)
- **Run specific tests:** `pnpm vitest path/to/test.ts --run` (never `pnpm test` for targeted work)
- **Full test suite:** `pnpm test` (runs all package tests via turbo)
- **Type check:** `pnpm lint:types`

### Non-obvious caveats

- `pnpm dev` fails by default with "You have 19 persistent tasks but turbo is configured for concurrency of 10." Pass `--concurrency=20` to fix.
- The `@btst/*` packages (under `packages/btst/`) are built with `unbuild` (not `tsdown`). They must be built before their cross-package tests work: `pnpm turbo build --filter="./packages/btst/*"`. The root `pnpm build` already handles this.
- `@better-auth/memory-adapter` and `@better-auth/redis-storage` have pre-existing test infra issues (no test files / missing test directory). These are not environment problems.
- Some tests (e.g. `db.test.ts` coerce test, `oauth-proxy.test.ts` UUID test) require Docker services. Start them with: `sudo dockerd &>/tmp/dockerd.log &` (wait ~3s), then `docker compose up -d --wait`.
- Lefthook pre-commit hooks run Biome, cspell, and lockfile validation automatically on commit.
