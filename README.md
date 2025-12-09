# Better Auth Fork

This is a fork of [Better Auth](https://github.com/better-auth/better-auth) that includes the `@btst` packages—a focused extraction of Better Auth's database layer.

## Purpose

This fork enables [Better Stack](https://github.com/better-stack-ai/better-stack), a composable full-stack plugin system for modern React frameworks. Better Stack uses the `@btst` packages for database schema definition, multi-ORM support, and CLI-driven migrations.

## @btst Packages

The `@btst` packages provide Better Auth's proven adapter pattern and CLI tools, focused purely on database management without the auth domain:

- `@btst/db` — Schema definition with `defineDb()`
- `@btst/cli` — Generate Prisma, Drizzle, and Kysely schemas
- `@btst/adapter-prisma` — Prisma adapter
- `@btst/adapter-drizzle` — Drizzle adapter
- `@btst/adapter-kysely` — Kysely adapter
- `@btst/adapter-mongodb` — MongoDB adapter
- `@btst/adapter-memory` — In-memory adapter (testing)

📖 **[Full Documentation →](./packages/btst/README.md)**

## Upstream

This fork stays aligned with [Better Auth](https://github.com/better-auth/better-auth) updates. The core `better-auth` package remains unchanged.

## License

MIT © [Better Auth](https://github.com/better-auth/better-auth)
