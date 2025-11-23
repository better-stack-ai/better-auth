import { createJiti } from "jiti";
import fs from "fs/promises";
import { logger } from "./logger";

/**
 * Loads and validates a btst schema file
 * Returns the schema object with getSchema method
 */
export async function loadBetterDbSchema(schemaPath: string) {
	// 1. Validate schema file exists
	try {
		await fs.access(schemaPath);
	} catch {
		logger.error(`Schema file not found: ${schemaPath}`);
		logger.info("Run `btst init` to create one.");
		process.exit(1);
	}

	// 2. Load schema with jiti (handles TypeScript)
	const jiti = createJiti(import.meta.url, {
		interopDefault: true,
	});

	let dbSchema: any;
	try {
		const schemaModule = jiti(schemaPath);

		// Try multiple export patterns, checking for getSchema method:
		// 1. Default export: export default defineDb(...)
		// 2. Named export 'dbSchema': export { dbSchema }
		// 3. Single export fallback: export const db = defineDb(...)
		if (schemaModule.default?.getSchema) {
			dbSchema = schemaModule.default;
		} else if (schemaModule.dbSchema?.getSchema) {
			dbSchema = schemaModule.dbSchema;
		} else if (schemaModule.getSchema) {
			dbSchema = schemaModule;
		}
	} catch (error: any) {
		logger.error("Failed to load schema:", error.message);
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
