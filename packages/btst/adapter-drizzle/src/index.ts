// Drizzle adapter for @btst
// Vendored from better-auth for independent publishing
export * from "./drizzle-adapter";

import type { Adapter, DatabaseDefinition } from "@btst/db";
import type { BetterAuthOptions } from "better-auth/types";
import { drizzleAdapter, type DB } from "./drizzle-adapter";

interface CreateDrizzleAdapterConfig {
	/**
	 * The database provider
	 */
	provider: "pg" | "mysql" | "sqlite";
	/**
	 * If the table names in the schema are plural
	 * set this to true. For example, if the schema
	 * has an object with a key "users" instead of "user"
	 */
	usePlural?: boolean;
	/**
	 * By default snake case is used for table and field names
	 * when the CLI is used to generate the schema. If you want
	 * to use camel case, set this to true.
	 * @default false
	 */
	camelCase?: boolean;
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
 * Helper function to create a Drizzle adapter with Better DB schema
 *
 * This handles passing the Better DB schema to the drizzleAdapter
 * by injecting it as a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { createDrizzleAdapter } from "@btst/adapter-drizzle";
 * import { drizzle } from "drizzle-orm/postgres-js";
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
 * const drizzleDb = drizzle(connection);
 * const adapter = createDrizzleAdapter(drizzleDb, db, { provider: "pg" });
 * ```
 */
export function createDrizzleAdapter(
	drizzle: DB,
	db: DatabaseDefinition,
	config: CreateDrizzleAdapterConfig,
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

		return drizzleAdapter(drizzle, config)(mergedOptions);
	};
}
