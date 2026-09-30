# Migrating to Better DB 3

Upgrade the database, adapters, plugins, and CLI together to `3.0.0`.
Install the matching Better Auth dependencies in every consumer:

```sh
pnpm add @btst/db@3.0.0 better-auth@1.7.6 @better-auth/core@1.7.6 @better-auth/utils@0.4.2
```

Use `@better-fetch/fetch@1.3.2` and `better-call@1.4.0` if your application
imports them directly. Do not retain overrides for earlier Better Auth versions.
The Drizzle adapter now requires `drizzle-orm@^0.45.2` or a supported 1.0 release
candidate (`>=1.0.0-rc.1 <2.0.0`). Kysely remains compatible with
`^0.28.17 || ^0.29.0`.

## Database configuration

Better Auth moved `experimental.joins` to `advanced.database.joins`:

```ts
betterAuth({
  advanced: { database: { joins: true } },
});
```

BTST's `createMemoryAdapter`, `createDrizzleAdapter`, `createPrismaAdapter`,
`createMongoDbAdapter`, and `createKyselyAdapter` continue enabling joins for
you. They preserve advanced database settings supplied to the helper and the
returned adapter factory. Existing `defineDb`, `createDbPlugin`, custom schema,
and adapter factory imports remain available.

Better Auth 1.7 validates database schemas at initialization by default.
Regenerate and review the schema for each application, then apply the required
migrations before deploying. Review Better Auth's 1.7 migration guide for
authentication schema and API changes. The upgraded generators include database
indexes and report unsafe migration changes; retain those warnings when reviewing
SQL for an existing database.

## CLI

The CLI still supports `generate` and `migrate`, custom plugin schemas, and
filtering Better Auth tables unless `--include-better-auth` is supplied.
Consumer project aliases, environment loading, server-only module handling, and
consumer-resolved Prisma/Drizzle dependencies remain supported.

```sh
pnpm dlx @btst/cli@3.0.0 generate --config ./lib/db.ts --output ./schema.ts --orm drizzle
```

The release remains ESM and CommonJS for the DB/adapters/plugins, and ESM for the
CLI. The CLI-only repair release path remains available for later patches.
