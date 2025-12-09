import type { BetterAuthDBSchema } from "@better-auth/core/db";

export type { DatabaseDefinition } from "./define-db";
export type { Adapter, DBAdapter } from "better-auth/types";

export interface DbPlugin {
	name: string;
	schema: BetterAuthDBSchema;
}
