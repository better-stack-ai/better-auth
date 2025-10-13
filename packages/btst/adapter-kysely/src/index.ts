// Kysely adapter for @btst
// Vendored from better-auth for independent publishing
export * from "./types";
export * from "./kysely-adapter";

import type { Adapter, DatabaseDefinition } from "@btst/db";
import type { Kysely } from "kysely";
import type { BetterAuthOptions } from "better-auth/types";
import { kyselyAdapter } from "./kysely-adapter";
import type { KyselyDatabaseType } from "./types";

interface CreateKyselyAdapterConfig {
	/**
	 * Database type.
	 */
	type?: KyselyDatabaseType;
	/**
	 * Use plural for table names.
	 *
	 * @default false
	 */
	usePlural?: boolean;
	/**
	 * Whether to execute multiple operations in a transaction.
	 *
	 * If the database doesn't support transactions,
	 * set this to `false` and operations will be executed sequentially.
	 * @default true
	 */
	transaction?: boolean;
}

/**
 * Helper function to create a Kysely adapter with Better DB schema
 *
 * This handles passing the Better DB schema to the kyselyAdapter
 * by injecting it as a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { createKyselyAdapter } from "@btst/adapter-kysely";
 * import { Kysely, PostgresDialect } from "kysely";
 *
 * const db = defineDb({
 *   todo: {
 *     modelName: "todo",
 *     fields: {
 *       title: { type: "string", required: true },
 *       completed: { type: "boolean", defaultValue: false },
 *     },
 *   },
 * });
 *
 * const kysely = new Kysely({ dialect: new PostgresDialect({ ... }) });
 * const adapter = createKyselyAdapter(kysely, db, { type: "postgres" });
 * ```
 */
export function createKyselyAdapter(
	kysely: Kysely<any>,
	db: DatabaseDefinition,
	config?: CreateKyselyAdapterConfig,
	options: BetterAuthOptions = {},
): (options: BetterAuthOptions) => Adapter {
	return (adapterOptions: BetterAuthOptions = {}) => {
		const mergedOptions = {
			...options,
			...adapterOptions,
			plugins: [
				...(options.plugins || []),
				...(adapterOptions.plugins || []),
				// Add Better DB schema as a plugin so getAuthTables can find it
				{
					id: "better-db-schema",
					schema: db.getSchema(),
				},
			],
		};

		return kyselyAdapter(kysely, config)(mergedOptions);
	};
}
