import { describe, it, expect, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

/**
 * E2E tests that actually run the CLI command
 * These catch issues that unit tests miss (like wrong adapter types)
 */
describe("E2E CLI tests", () => {
	const testDir = path.join(process.cwd(), "test-output");
	const testSchema = path.join(testDir, "test-db.ts");

	afterEach(async () => {
		// Clean up test files
		await fs.rm(testDir, { recursive: true, force: true });
	});

	it("should run generate command for Prisma", async () => {
		// Create test directory and schema
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  product: {
    modelName: "product",
    fields: {
      name: { type: "string", required: true },
      price: { type: "number", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.prisma");

		// Run actual CLI command
		const { stdout, stderr } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=prisma --output=${outputPath} --yes`,
			{ cwd: process.cwd() },
		);

		// Verify output file was created
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		// Verify content
		const content = await fs.readFile(outputPath, "utf8");
		expect(content).toContain("datasource db");
		expect(content).toContain("model Product");
		expect(content).toContain("name");
		expect(content).toContain("price");
	}, 10000); // 10 second timeout

	it("should run generate command for Drizzle", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  article: {
    modelName: "article",
    fields: {
      title: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.ts");

		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=drizzle --output=${outputPath} --yes`,
			{ cwd: process.cwd() },
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content).toContain('from "drizzle-orm/');
		expect(content).toContain("export const article");
	}, 10000);

	it("should fail Kysely without DATABASE_URL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  task: {
    modelName: "task",
    fields: {
      title: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");

		// Should fail without DATABASE_URL
		try {
			await execAsync(
				`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
				{
					cwd: process.cwd(),
					env: { ...process.env, DATABASE_URL: undefined }, // Remove DATABASE_URL
				},
			);
			expect.fail("Should have thrown error");
		} catch (error: any) {
			expect(error.message).toContain(
				"Kysely generation requires database connection",
			);
		}
	}, 10000);

	it("should generate Kysely migrations with SQLite database connection", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  task: {
    modelName: "task",
    fields: {
      title: { type: "string", required: true },
      completed: { type: "boolean", defaultValue: false },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");
		const dbPath = path.join(testDir, "test.db");

		// Run with SQLite DATABASE_URL
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: `sqlite:${dbPath}` },
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("task");
		expect(content).toContain("title");
		expect(content).toContain("completed");
	}, 15000);

	it("should generate Kysely migrations using --database-url flag instead of env var", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  item: {
    modelName: "item",
    fields: {
      name: { type: "string", required: true },
      quantity: { type: "number", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-flag.sql");
		const dbPath = path.join(testDir, "test-flag.db");

		// Run with --database-url flag (no DATABASE_URL env var)
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --database-url=sqlite:${dbPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: undefined }, // Remove DATABASE_URL
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("item");
		expect(content).toContain("name");
		expect(content).toContain("quantity");
	}, 15000);

	it("should prioritize --database-url flag over DATABASE_URL env var", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  priority: {
    modelName: "priority",
    fields: {
      level: { type: "number", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-priority.sql");
		const flagDbPath = path.join(testDir, "flag-db.db");
		const envDbPath = path.join(testDir, "env-db.db");

		// Run with both --database-url flag and DATABASE_URL env var
		// Flag should take priority
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --database-url=sqlite:${flagDbPath} --yes`,
			{
				cwd: process.cwd(),
				env: { ...process.env, DATABASE_URL: `sqlite:${envDbPath}` },
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		// The flag db should be created, not the env db
		const flagDbExists = await fs
			.access(flagDbPath)
			.then(() => true)
			.catch(() => false);
		expect(flagDbExists).toBe(true);
	}, 15000);

	it("should generate Kysely migrations with PostgreSQL (postgres:// prefix)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  product: {
    modelName: "product",
    fields: {
      name: { type: "string", required: true },
      price: { type: "number", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations.sql");

		// Test with postgres:// prefix (both formats should work)
		// Using postgres-kysely container on port 5433
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("product");
		expect(content).toContain("name");
		expect(content).toContain("price");
	}, 20000);

	it("should generate Kysely migrations with PostgreSQL (postgresql:// prefix)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  order: {
    modelName: "orders",
    fields: {
      total: { type: "number", required: true },
      status: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-pg.sql");

		// Test with postgresql:// prefix (the issue we fixed)
		// Using postgres-kysely container on port 5433
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgresql://user:password@localhost:5433/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("orders");
		expect(content).toContain("total");
		expect(content).toContain("status");
	}, 20000);

	it("should generate Kysely migrations with MySQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  customer: {
    modelName: "customer",
    fields: {
      email: { type: "string", required: true },
      name: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrations-mysql.sql");

		// Test MySQL connection using mysql-kysely container on port 3307
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "mysql://user:password@localhost:3307/better_auth",
				},
			},
		);

		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("customer");
		expect(content).toContain("email");
		expect(content).toContain("name");
	}, 20000);

	it("should run migrate command with PostgreSQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  invoice: {
    modelName: "invoice",
    fields: {
      amount: { type: "number", required: true },
      paid: { type: "boolean", defaultValue: false },
    },
  },
});
`,
			"utf8",
		);

		// Test migrate command with postgres-kysely container
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Verify output mentions migration success or up to date
		expect(
			stdout.includes("Migrations completed") || stdout.includes("up to date"),
		).toBe(true);
	}, 30000);

	it("should run migrate command with MySQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  receipt: {
    modelName: "receipt",
    fields: {
      total: { type: "number", required: true },
      date: { type: "date", required: true },
    },
  },
});
`,
			"utf8",
		);

		// Test migrate command with mysql-kysely container
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "mysql://user:password@localhost:3307/better_auth",
				},
			},
		);

		// Verify output mentions migration success or up to date
		expect(
			stdout.includes("Migrations completed") || stdout.includes("up to date"),
		).toBe(true);
	}, 30000);

	it("should filter auth tables with --filter-auth flag", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  custom: {
    modelName: "custom",
    fields: {
      data: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "schema.prisma");

		await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=prisma --output=${outputPath} --filter-auth --yes`,
			{ cwd: process.cwd() },
		);

		const content = await fs.readFile(outputPath, "utf8");

		// Should NOT have auth tables
		expect(content).not.toContain("model User");
		expect(content).not.toContain("model Session");

		// Should have custom table
		expect(content).toContain("model Custom");
	}, 10000);

	it("should not create empty file when filtering removes all content (Kysely)", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  emptyCheckTable: {
    modelName: "empty_check_table",
    fields: {
      data: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "empty-check.sql");
		const initialMigrationPath = path.join(testDir, "initial.sql");

		// Clean database first to ensure we're starting fresh
		const { Pool } = await import("pg");
		let pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		await pool.query(
			'DROP TABLE IF EXISTS empty_check_table, verification, account, session, "user" CASCADE',
		);
		await pool.end();

		// Generate initial migration (includes both auth tables and custom table)
		await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${initialMigrationPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Apply the migration to create all tables
		pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		const initialMigration = await fs.readFile(initialMigrationPath, "utf8");
		for (const statement of initialMigration
			.split(";")
			.filter((s) => s.trim())) {
			await pool.query(statement);
		}
		await pool.end();

		// Now run with --filter-auth when only auth tables would need to be created (but they're already there)
		// This simulates the user's scenario where custom tables exist and they run generate with --filter-auth
		const { stdout } = await execAsync(
			`node ./dist/index.mjs generate --config=${testSchema} --orm=kysely --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Should say schema is up to date
		expect(stdout).toContain("Schema is up to date");

		// File should not exist
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(false);
	}, 20000);

	it("should filter auth tables from migrate command output with --filter-auth", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  product: {
    modelName: "product",
    fields: {
      name: { type: "string", required: true },
      price: { type: "number", required: true },
      stock: { type: "number", defaultValue: 0 },
    },
  },
  category: {
    modelName: "category",
    fields: {
      title: { type: "string", required: true },
      description: { type: "string", required: false },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "filtered.sql");

		// Clean database first
		const { Pool } = await import("pg");
		const pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		await pool.query(
			'DROP TABLE IF EXISTS product, category, verification, account, session, "user", "rateLimit" CASCADE',
		);
		await pool.end();

		// Run migrate with --filter-auth and --output
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Should generate SQL file
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");

		// Should contain custom tables
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("product");
		expect(content).toContain("category");

		// Should NOT contain auth tables
		expect(content.toLowerCase()).not.toContain('create table "user"');
		expect(content.toLowerCase()).not.toContain("create table user");
		expect(content.toLowerCase()).not.toContain('create table "session"');
		expect(content.toLowerCase()).not.toContain("create table session");
		expect(content.toLowerCase()).not.toContain('create table "account"');
		expect(content.toLowerCase()).not.toContain("create table account");
		expect(content.toLowerCase()).not.toContain('create table "verification"');
		expect(content.toLowerCase()).not.toContain("create table verification");

		// Compare against fixture
		const expectedPath = path.join(
			__dirname,
			"fixtures/expected-migrate-filtered.sql",
		);
		const expected = await fs.readFile(expectedPath, "utf8");
		expect(content.trim()).toBe(expected.trim());
	}, 30000);

	it("should not create file when migrate --filter-auth removes all content", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  migrateEmpty: {
    modelName: "migrate_empty",
    fields: {
      data: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "migrate-empty.sql");
		const initialPath = path.join(testDir, "migrate-initial.sql");

		// Clean database and set up
		const { Pool } = await import("pg");
		let pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		await pool.query(
			'DROP TABLE IF EXISTS migrate_empty, verification, account, session, "user", "rateLimit" CASCADE',
		);
		await pool.end();

		// Create all tables first (including custom table)
		await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --output=${initialPath} --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Apply the migration
		pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		const initialSql = await fs.readFile(initialPath, "utf8");
		for (const statement of initialSql.split(";").filter((s) => s.trim())) {
			await pool.query(statement);
		}
		await pool.end();

		// Now run migrate with --filter-auth (should be no changes since custom table exists)
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Should indicate database is up to date
		expect(stdout).toContain("Database is up to date");

		// File should not exist
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(false);
	}, 30000);

	it("should show filtered pending migrations in migrate command", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  warehouse: {
    modelName: "warehouse",
    fields: {
      location: { type: "string", required: true },
      capacity: { type: "number", required: true },
    },
  },
  inventory: {
    modelName: "inventory",
    fields: {
      itemId: { type: "string", required: true },
      quantity: { type: "number", required: true },
    },
  },
});
`,
			"utf8",
		);

		// Clean database
		const { Pool } = await import("pg");
		const pool = new Pool({
			connectionString: "postgres://user:password@localhost:5433/better_auth",
		});
		await pool.query(
			'DROP TABLE IF EXISTS warehouse, inventory, verification, account, session, "user", "rateLimit" CASCADE',
		);
		await pool.end();

		const outputPath = path.join(testDir, "pending.sql");

		// Run migrate with --filter-auth to see pending migrations
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "postgres://user:password@localhost:5433/better_auth",
				},
			},
		);

		// Should show pending migrations message
		expect(stdout).toContain("Pending migrations");
		expect(stdout).toContain("Filtered out Better Auth default tables");

		// Should mention custom tables but NOT auth tables in the table list
		expect(stdout).toContain("warehouse");
		expect(stdout).toContain("inventory");
		// Check that user/session tables are not in the "Tables to create" list
		// (the filter message itself will contain "user" and "session" as examples)
		const tablesSection = stdout.substring(stdout.indexOf("Tables to create"));
		expect(tablesSection).not.toContain("- user");
		expect(tablesSection).not.toContain("- session");

		// Verify output file
		const content = await fs.readFile(outputPath, "utf8");
		expect(content).toContain("warehouse");
		expect(content).toContain("inventory");
		expect(content).not.toContain('create table "user"');
		expect(content).not.toContain('create table "session"');

		// Compare against fixture
		const expectedPath = path.join(
			__dirname,
			"fixtures/expected-migrate-pending.sql",
		);
		const expected = await fs.readFile(expectedPath, "utf8");
		expect(content.trim()).toBe(expected.trim());
	}, 30000);

	it("should filter auth tables from migrate command in MySQL", async () => {
		await fs.mkdir(testDir, { recursive: true });
		await fs.writeFile(
			testSchema,
			`
import { defineDb } from "@btst/db";

export default defineDb({
  store: {
    modelName: "store",
    fields: {
      name: { type: "string", required: true },
      address: { type: "string", required: true },
    },
  },
});
`,
			"utf8",
		);

		const outputPath = path.join(testDir, "mysql.sql");

		// Clean MySQL database
		const mysql = await import("mysql2/promise");
		const connection = await mysql.createConnection({
			host: "localhost",
			port: 3307,
			user: "user",
			password: "password",
			database: "better_auth",
		});
		await connection.query(
			"DROP TABLE IF EXISTS store, verification, account, session, user, rateLimit",
		);
		await connection.end();

		// Run migrate with --filter-auth for MySQL
		const { stdout } = await execAsync(
			`node ./dist/index.mjs migrate --config=${testSchema} --output=${outputPath} --filter-auth --yes`,
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					DATABASE_URL: "mysql://user:password@localhost:3307/better_auth",
				},
			},
		);

		// Should generate SQL
		const fileExists = await fs
			.access(outputPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);

		const content = await fs.readFile(outputPath, "utf8");

		// Should contain custom table
		expect(content.toLowerCase()).toContain("create table");
		expect(content).toContain("store");

		// Should NOT contain auth tables
		expect(content.toLowerCase()).not.toContain("create table user");
		expect(content.toLowerCase()).not.toContain("create table session");

		// Compare against fixture
		const expectedPath = path.join(
			__dirname,
			"fixtures/expected-migrate-mysql.sql",
		);
		const expected = await fs.readFile(expectedPath, "utf8");
		expect(content.trim()).toBe(expected.trim());
	}, 30000);
});
