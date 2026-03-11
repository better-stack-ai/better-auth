// Re-export types and utilities from Better Auth that we need
export type {
	BetterAuthDBSchema,
	DBFieldAttribute,
	DBFieldAttributeConfig,
	DBFieldType,
	DBPrimitive,
} from "@better-auth/core/db";

// Export our schema definition and plugin system
export { defineDb } from "./define-db";
export { createDbPlugin } from "./plugin";

// Export types for better DX
export type { Adapter, DatabaseDefinition, DBAdapter, DbPlugin } from "./types";
