// Re-export types and utilities from Better Auth that we need
export type {
	DBFieldAttribute,
	DBFieldAttributeConfig,
	DBFieldType,
	DBPrimitive,
	BetterAuthDBSchema,
} from "@better-auth/core/db";

// Export our schema definition and plugin system
export { defineDb } from "./define-db";
export { createDbPlugin } from "./plugin";

// Export types for better DX
export type { DbPlugin, Adapter, DatabaseDefinition } from "./types";
