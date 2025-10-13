/**
 * ⚠️ AUTO-GENERATED - DO NOT MODIFY
 *
 * This file is automatically copied from better-auth.
 * Source: packages/cli/src/generators/types.ts
 *
 * To update: run `pnpm sync-upstream`
 * Any manual changes will be overwritten.
 */

import type { Adapter, BetterAuthOptions } from "better-auth";

export interface SchemaGenerator {
	(opts: {
		file?: string;
		adapter: Adapter;
		options: BetterAuthOptions;
	}): Promise<{
		code?: string;
		fileName: string;
		overwrite?: boolean;
		append?: boolean;
	}>;
}
