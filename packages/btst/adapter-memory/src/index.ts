// Re-export everything from Better Auth's Memory adapter
export * from "better-auth/adapters/memory";

import type { Adapter, DatabaseDefinition } from "@btst/db";
import { memoryAdapter } from "better-auth/adapters/memory";
import type { BetterAuthOptions } from "better-auth/types";

/**
 * Helper function to create a memory adapter with Better DB schema
 *
 * This handles passing the Better DB schema to the memoryAdapter
 * by injecting it as a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { createMemoryAdapter } from "@btst/adapter-memory";
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
 * const adapter = createMemoryAdapter(db);
 * ```
 */
export function createMemoryAdapter(
	db: DatabaseDefinition,
	options: BetterAuthOptions = {},
): (options: BetterAuthOptions) => Adapter {
	const schema = db.getSchema();

	// Initialize MemoryDB with correct model names (lowercase table names)
	const memoryDB: Record<string, any[]> = {};
	for (const [_key, tableConfig] of Object.entries(schema)) {
		const tableName = (tableConfig as any).modelName || _key;
		memoryDB[tableName] = [];
	}

	// Return an adapter factory that includes the schema as a plugin
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
					schema: schema,
				},
			],
		};

		return memoryAdapter(memoryDB)(mergedOptions);
	};
}
