import { betterAuth } from "better-auth";
import { logger } from "./logger";

interface DatabaseConnection {
	database: any;
	cleanup: () => Promise<void>;
}

/**
 * Creates a database connection from a DATABASE_URL string
 * Returns both the database instance and a cleanup function
 */
export async function createDatabaseConnection(
	databaseUrl: string,
): Promise<DatabaseConnection> {
	let connectionPool: any = null;

	try {
		if (
			databaseUrl.startsWith("postgres://") ||
			databaseUrl.startsWith("postgresql://")
		) {
			// PostgreSQL - create Kysely instance with PostgresDialect
			// Use dynamic imports to avoid requiring kysely when not using it
			const { Kysely, PostgresDialect } = await import("kysely");
			const { Pool } = await import("pg");
			const pool = new Pool({ connectionString: databaseUrl });
			connectionPool = pool;
			const kysely = new Kysely({
				dialect: new PostgresDialect({
					pool: pool,
				}),
			});
			const database = { db: kysely, type: "postgres" };

			return {
				database,
				cleanup: async () => {
					await pool.end();
				},
			};
		} else if (databaseUrl.startsWith("mysql://")) {
			// MySQL - create Kysely instance with MysqlDialect
			// Use dynamic imports to avoid requiring kysely when not using it
			const { Kysely, MysqlDialect } = await import("kysely");
			const { createPool } = await import("mysql2/promise");
			const pool = createPool(databaseUrl);
			connectionPool = pool;
			const kysely = new Kysely({
				dialect: new MysqlDialect(pool),
			});
			const database = { db: kysely, type: "mysql" };

			return {
				database,
				cleanup: async () => {
					await pool.end();
				},
			};
		} else {
			// SQLite - pass raw database, Kysely will wrap it
			const Database = (await import("better-sqlite3")).default;
			// Extract file path from URL (e.g., "sqlite:./dev.db" -> "./dev.db")
			const dbPath = databaseUrl.replace(/^sqlite:/, "");
			const database = new Database(dbPath);

			return {
				database,
				cleanup: async () => {
					// SQLite doesn't need explicit cleanup for file-based databases
				},
			};
		}
	} catch (error: any) {
		if (error.code === "ERR_MODULE_NOT_FOUND") {
			logger.error("Missing database driver dependency");
			if (
				databaseUrl.startsWith("postgres://") ||
				databaseUrl.startsWith("postgresql://")
			) {
				logger.info("\nInstall PostgreSQL driver:\n  npm install pg");
			} else if (databaseUrl.startsWith("mysql://")) {
				logger.info("\nInstall MySQL driver:\n  npm install mysql2");
			} else {
				logger.info("\nInstall SQLite driver:\n  npm install better-sqlite3");
			}
			process.exit(1);
		}
		throw error;
	}
}

/**
 * Creates a minimal betterAuth instance with the given database and schema
 * Used for CLI operations like migrations and schema generation
 */
export function createBetterAuthInstance(database: any, schema: any) {
	return betterAuth({
		database,
		plugins: [
			{
				id: "better-db-schema",
				schema: schema,
			},
		],
	});
}
