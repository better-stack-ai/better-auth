/**
 * ⚠️ AUTO-GENERATED - DO NOT MODIFY
 *
 * This file is automatically copied from better-auth.
 * Source: packages/cli/src/generators/kysely.ts
 *
 * To update: run `pnpm sync-upstream`
 * Any manual changes will be overwritten.
 */

import { getMigrations } from "better-auth/db";
import type { SchemaGenerator } from "./types";

export const generateMigrations: SchemaGenerator = async ({
	options,
	file,
}) => {
	const { compileMigrations } = await getMigrations(options);
	const migrations = await compileMigrations();
	return {
		code: migrations.trim() === ";" ? "" : migrations,
		fileName:
			file ||
			`./better-auth_migrations/${new Date()
				.toISOString()
				.replace(/:/g, "-")}.sql`,
	};
};
