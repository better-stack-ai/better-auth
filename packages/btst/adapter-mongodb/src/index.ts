// Re-export everything from Better Auth's MongoDB adapter
export * from "better-auth/adapters/mongodb";

import type { Adapter, DatabaseDefinition } from "@btst/db";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import type { BetterAuthOptions } from "better-auth/types";
import type { Db } from "mongodb";

/**
 * Helper function to create a MongoDB adapter with Better DB schema
 *
 * This handles passing the Better DB schema to the mongodbAdapter
 * by injecting it as a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { createMongoDbAdapter } from "@btst/adapter-mongodb";
 * import { MongoClient } from "mongodb";
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
 * const client = new MongoClient(mongoUrl);
 * const mongoDb = client.db("mydb");
 * const adapter = createMongoDbAdapter(mongoDb, db);
 * ```
 */
export function createMongoDbAdapter(
	mongoDb: Db,
	db: DatabaseDefinition,
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

		return mongodbAdapter(mongoDb)(mergedOptions);
	};
}
