## Cursor Cloud specific instructions

### Environment

- **Node.js 24** (per `.nvmrc`), managed via nvm
- **pnpm 10.30.2** (per `packageManager` in root `package.json`), activated via corepack
- All core tests use SQLite in-memory — no external services needed for normal development

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
- Two tests in `better-auth` (`db.test.ts` coerce test, `oauth-proxy.test.ts` passthrough UUID test) have pre-existing failures (timeout / logic issues). They are not caused by the environment.
- Adapter e2e tests and full database adapter tests require Docker services: `docker compose up -d` (PostgreSQL, MySQL, MongoDB, Redis, MSSQL).
- Lefthook pre-commit hooks run Biome, cspell, and lockfile validation automatically on commit.
