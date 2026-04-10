import type { BetterAuthDBSchema } from "@better-auth/core/db";

export type { DBAdapter } from "better-auth/types";
export type { DatabaseDefinition } from "./define-db";

export interface DbPlugin {
	name: string;
	schema: BetterAuthDBSchema;
}
