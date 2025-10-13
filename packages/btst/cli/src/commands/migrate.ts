import { Command } from "commander";
import { getMigrations } from "better-auth/db";
import yoctoSpinner from "yocto-spinner";
import prompts from "prompts";
import path from "path";
import fs from "fs/promises";
import { logger } from "../utils/logger";
import { loadBetterDbSchema } from "../utils/schema-loader";
import {
	filterAuthTables,
	DEFAULT_AUTH_TABLES,
} from "../utils/filter-auth-tables";

interface MigrateOptions {
	config: string; // REQUIRED
	output?: string; // Optional: output file path for generated SQL
	databaseUrl?: string; // Optional: for Kysely connection
	cwd?: string;
	yes?: boolean;
	filterAuth?: boolean; // Filter out Better Auth default tables
}

async function migrateAction(options: MigrateOptions) {
	logger.info("🔧 Better DB Migrate");
	logger.warn("⚠️  Note: This only works with Kysely adapter");
	logger.info("For Prisma: use `npx prisma migrate dev`");
	logger.info("For Drizzle: use `npx drizzle-kit push`\n");

	const cwd = options.cwd || process.cwd();
	const schemaPath = path.resolve(cwd, options.config);
	const outputPath = options.output ? path.resolve(cwd, options.output) : null;

	let cleanup: (() => Promise<void>) | null = null;

	try {
		// 1. Load and validate schema
		const dbSchema = await loadBetterDbSchema(schemaPath);

		// 2. Get Better Auth schema format
		const betterAuthSchema = dbSchema.getSchema();

		// 3. Get database URL
		const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;

		if (!databaseUrl) {
			logger.error("Database connection required");
			logger.info("Set DATABASE_URL env var or use --database-url flag");
			process.exit(1);
		}

		// 4. Create database connection (dynamic import to avoid kysely when not needed)
		const { createDatabaseConnection, createBetterAuthInstance } = await import(
			"../utils/database"
		);

		const { database, cleanup: dbCleanup } =
			await createDatabaseConnection(databaseUrl);
		cleanup = dbCleanup;

		// 5. Create betterAuth instance
		const auth = createBetterAuthInstance(database, betterAuthSchema);

		// 6. Get migrations
		const spinner = yoctoSpinner({ text: "Preparing migrations..." });
		spinner.start();
		let toBeAdded: any[];
		let toBeCreated: any[];
		let runMigrations: () => Promise<void>;
		let compileMigrations: () => Promise<string>;

		try {
			const migrations = await getMigrations(auth.options);
			toBeAdded = migrations.toBeAdded;
			toBeCreated = migrations.toBeCreated;
			runMigrations = migrations.runMigrations;
			compileMigrations = migrations.compileMigrations;
			spinner.stop();
		} catch (error: any) {
			spinner.stop();
			logger.error("Failed to prepare migrations:", error.message);
			logger.info("\nPossible causes:");
			logger.info("• Database connection failed");
			logger.info("• Not using Kysely adapter");
			logger.info("• Invalid DATABASE_URL");
			process.exit(1);
		}

		// 7. Filter auth tables if requested
		if (options.filterAuth) {
			toBeCreated = toBeCreated.filter(
				(t) => !DEFAULT_AUTH_TABLES.includes(t.table.toLowerCase()),
			);
			toBeAdded = toBeAdded.filter(
				(c) => !DEFAULT_AUTH_TABLES.includes(c.table.toLowerCase()),
			);
			logger.info(
				"🧹 Filtered out Better Auth default tables (user, session, etc.)",
			);
		}

		// 8. Show pending migrations
		if (toBeCreated.length === 0 && toBeAdded.length === 0) {
			logger.info("✓ Database is up to date.");
			return;
		}

		logger.info("\n📋 Pending migrations:");
		if (toBeCreated.length > 0) {
			logger.info(`  Tables to create: ${toBeCreated.length}`);
			toBeCreated.forEach((t) => logger.info(`    - ${t.table}`));
		}
		if (toBeAdded.length > 0) {
			logger.info(`  Columns to add: ${toBeAdded.length}`);
			toBeAdded.forEach((c) => logger.info(`    - ${c.table}.${c.column}`));
		}

		// 9. If output is specified, generate SQL file instead of running
		if (outputPath) {
			// Check if file exists and prompt if not --yes
			const fileExists = await fs
				.access(outputPath)
				.then(() => true)
				.catch(() => false);

			if (fileExists && !options.yes) {
				const response = await prompts({
					type: "confirm",
					name: "continue",
					message: `File ${outputPath} already exists. Overwrite?`,
					initial: false,
				});

				if (!response.continue) {
					logger.warn("Cancelled.");
					return;
				}
			}

			const sqlSpinner = yoctoSpinner({ text: "Generating SQL..." });
			sqlSpinner.start();
			try {
				let sql = await compileMigrations();

				// Filter auth tables from SQL if requested
				if (options.filterAuth) {
					sql = filterAuthTables(sql, "kysely");

					// Check if filtering removed all content
					if (!sql || sql.trim() === "" || sql.trim() === ";") {
						sqlSpinner.stop();
						logger.info(
							"✓ No custom tables need to be migrated. Database is up to date.",
						);
						return;
					}
				}

				await fs.writeFile(outputPath, sql.trim(), "utf8");
				sqlSpinner.stop();
				logger.success(`✅ Migration SQL saved to: ${outputPath}`);
				logger.info("\nNext steps:");
				logger.info("  1. Review the generated SQL");
				logger.info(
					"  2. Apply it using your database client or migration tool",
				);
			} catch (error: any) {
				sqlSpinner.stop();
				logger.error("Failed to generate SQL:", error.message);
				process.exit(1);
			}
			return;
		}

		// 10. Confirm before running migrations directly
		if (!options.yes) {
			const response = await prompts({
				type: "confirm",
				name: "continue",
				message: "Run these migrations?",
				initial: true,
			});

			if (!response.continue) {
				logger.warn("Cancelled.");
				return;
			}
		}

		// 11. Run migrations
		const runSpinner = yoctoSpinner({ text: "Running migrations..." });
		runSpinner.start();
		try {
			await runMigrations();
			runSpinner.stop();
			logger.success("✅ Migrations completed!");
		} catch (error: any) {
			runSpinner.stop();
			logger.error("Migration failed:", error.message);
			process.exit(1);
		}
	} finally {
		// 12. Cleanup: Close database connection
		if (cleanup) {
			await cleanup();
		}
	}
}

// Command definition with REQUIRED options
export const migrateCommand = new Command("migrate")
	.description("Run database migrations (Kysely only)")
	.requiredOption("--config <path>", "Path to @btst/db schema file")
	.option(
		"--output <path>",
		"Output path for migration SQL (if not set, runs migrations directly)",
	)
	.option(
		"--database-url <url>",
		"Database connection URL (or use DATABASE_URL env var)",
	)
	.option("--cwd <dir>", "Working directory", process.cwd())
	.option("-y, --yes", "Skip confirmation prompts")
	.option(
		"--filter-auth",
		"Filter out Better Auth default tables (user, session, etc.)",
	)
	.action(migrateAction);
