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
