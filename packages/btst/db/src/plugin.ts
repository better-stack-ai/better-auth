import type { BetterAuthDBSchema } from "@better-auth/core/db";
import type { DbPlugin } from "./types";

export function createDbPlugin(
	name: string,
	schema: BetterAuthDBSchema,
): DbPlugin {
	return {
		name,
		schema,
	};
}
