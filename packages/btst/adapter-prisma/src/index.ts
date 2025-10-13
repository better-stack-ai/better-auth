// Re-export everything from Better Auth's Prisma adapter
export * from "better-auth/adapters/prisma";

import type { Adapter, DatabaseDefinition } from "@btst/db";
import { prismaAdapter, type PrismaConfig } from "better-auth/adapters/prisma";
import type { BetterAuthOptions } from "better-auth/types";

/**
 * Helper function to create a Prisma adapter with Better DB schema
 *
 * This handles passing the Better DB schema to the prismaAdapter
 * by injecting it as a plugin so Better Auth can find your models.
 *
 * @example
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { createPrismaAdapter } from "@btst/adapter-prisma";
 * import { PrismaClient } from "@prisma/client";
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
 * const prisma = new PrismaClient();
 * const adapter = createPrismaAdapter(prisma, db, { provider: "postgresql" });
 * ```
 */
export function createPrismaAdapter(
	prisma: any,
	db: DatabaseDefinition,
	config: PrismaConfig,
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

		return prismaAdapter(prisma, config)(mergedOptions);
	};
}
