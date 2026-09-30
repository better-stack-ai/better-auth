/**
 * ⚠️ AUTO-GENERATED - DO NOT MODIFY
 *
 * This file is automatically copied from better-auth.
 * Source: packages/kysely-adapter/src/kysely-migration-tables.ts
 *
 * To update: run `pnpm sync-upstream`
 * Any manual changes will be overwritten.
 */

/**
 * Kysely's internal migration table names, mirrored as local constants.
 *
 * Kysely 0.29 moved these from its main entry to the `kysely/migration`
 * subpath (which 0.28 lacks), and the main entry now exports only type stubs
 * with no runtime value, which breaks strict ESM bundlers.
 *
 * The values are stable parts of Kysely's public migration contract. Mirroring
 * them allows the SQLite dialects to support both Kysely 0.28 and 0.29.
 *
 * TODO: Import these from `kysely/migration` after dropping Kysely 0.28.
 */
export const DEFAULT_MIGRATION_TABLE = "kysely_migration";
export const DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";
