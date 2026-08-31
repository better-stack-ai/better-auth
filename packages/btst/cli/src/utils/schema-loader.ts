import fs from "node:fs/promises";
import path from "node:path";
import type { BetterAuthDBSchema } from "@btst/db";
import { createJiti } from "jiti";
import { logger } from "./logger";
import { loadProjectEnv } from "./project-env";

interface BetterDbSchema {
	getSchema(): BetterAuthDBSchema;
}

interface SchemaModule {
	default?: BetterDbSchema;
	dbSchema?: BetterDbSchema;
	getSchema?: unknown;
}

interface ImportDeclarationPath {
	node: { source: { value: string } };
	remove(): void;
}

function stripServerOnlyImports() {
	return {
		visitor: {
			ImportDeclaration(importPath: ImportDeclarationPath) {
				if (importPath.node.source.value === "server-only") {
					importPath.remove();
				}
			},
		},
	};
}

async function findProjectConfig(cwd: string): Promise<string | undefined> {
	for (const fileName of ["tsconfig.json", "jsconfig.json"]) {
		const candidate = path.join(cwd, fileName);
		try {
			await fs.access(candidate);
			return candidate;
		} catch {}
	}
	return undefined;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isBetterDbSchema(value: unknown): value is BetterDbSchema {
	return (
		typeof value === "object" &&
		value !== null &&
		"getSchema" in value &&
		typeof value.getSchema === "function"
	);
}

/**
 * Loads and validates a btst schema file
 * Returns the schema object with getSchema method
 */
export async function loadBetterDbSchema(schemaPath: string, cwd: string) {
	// 1. Validate schema file exists
	try {
		await fs.access(schemaPath);
	} catch {
		logger.error(`Schema file not found: ${schemaPath}`);
		logger.info("Run `btst init` to create one.");
		process.exit(1);
	}

	// 2. Match the consumer project's environment and module resolution.
	loadProjectEnv(cwd);
	const tsconfigPath = await findProjectConfig(cwd);
	const jiti = createJiti(schemaPath, {
		interopDefault: true,
		tsconfigPaths: tsconfigPath,
		transformOptions: {
			babel: { plugins: [stripServerOnlyImports] },
		},
	});

	let dbSchema: BetterDbSchema | undefined;
	try {
		const schemaModule = await jiti.import<SchemaModule>(schemaPath);

		// Try multiple export patterns, checking for getSchema method:
		// 1. Default export: export default defineDb(...)
		// 2. Named export 'dbSchema': export { dbSchema }
		// 3. Single export fallback: export const db = defineDb(...)
		if (isBetterDbSchema(schemaModule.default)) {
			dbSchema = schemaModule.default;
		} else if (isBetterDbSchema(schemaModule.dbSchema)) {
			dbSchema = schemaModule.dbSchema;
		} else if (isBetterDbSchema(schemaModule)) {
			// Preserve the module receiver for schemas whose getSchema uses `this`.
			dbSchema = schemaModule;
		}
	} catch (error) {
		logger.error("Failed to load schema:", getErrorMessage(error));
		logger.info("\nTroubleshooting:");
		logger.info("• Check for syntax errors in schema file");
		logger.info("• Ensure file exports defineDb() result");
		process.exit(1);
	}

	// 3. Validate it's a btst schema
	if (!dbSchema?.getSchema) {
		logger.error("Invalid schema: must export defineDb() result");
		logger.info("\nSupported export patterns:");
		logger.info("• export default defineDb(...)");
		logger.info("• export { dbSchema }");
		logger.info("• export const db = defineDb(...)");
		process.exit(1);
	}

	return dbSchema;
}
