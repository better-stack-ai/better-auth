import { defineDb } from "@btst/db";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { Kysely, SqliteDialect } from "kysely";
import { describe, expect, it } from "vitest";
import { createDrizzleAdapter } from "../../adapter-drizzle/src";
import { createKyselyAdapter } from "../../adapter-kysely/src";

const definition = defineDb({
	document: {
		modelName: "document",
		fields: {
			title: { type: "string", required: true },
			updatedAt: { type: "date", required: true },
		},
	},
});
const document = sqliteTable("document", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	updatedAt: text("updatedAt").notNull(),
});

/** @see https://github.com/better-auth/better-auth/tree/v1.7.14/packages/drizzle-adapter */
describe("published Auth adapter compatibility", () => {
	it("round-trips date fields and date guards through Drizzle string columns", async () => {
		const sqlite = new Database(":memory:");
		sqlite.exec(
			"CREATE TABLE document (id TEXT PRIMARY KEY, title TEXT NOT NULL, updatedAt TEXT NOT NULL)",
		);
		try {
			const client = drizzle(sqlite, { schema: { document } });
			const adapter = createDrizzleAdapter(client, definition, {
				provider: "sqlite",
			})({});
			const updatedAt = new Date("2026-10-01T10:00:00.000Z");
			const created = await adapter.create<{ id: string; updatedAt: Date }>({
				model: "document",
				data: { title: "Before", updatedAt },
			});
			expect(created.updatedAt).toEqual(updatedAt);
			const nextDate = new Date(updatedAt.getTime() + 1);
			expect(
				await adapter.updateMany({
					model: "document",
					where: [
						{ field: "id", value: created.id },
						{ field: "updatedAt", value: updatedAt },
					],
					update: { title: "After", updatedAt: nextDate },
				}),
			).toBe(1);
			expect(
				await adapter.findOne({
					model: "document",
					where: [{ field: "updatedAt", value: updatedAt }],
				}),
			).toBeNull();
			expect(
				await adapter.findOne({
					model: "document",
					where: [{ field: "updatedAt", value: nextDate }],
				}),
			).toMatchObject({ title: "After", updatedAt: nextDate });
		} finally {
			sqlite.close();
		}
	});

	/** @see https://github.com/better-auth/better-auth/tree/v1.7.14/packages/kysely-adapter */
	it("consumes at most one Kysely row matching the guard", async () => {
		const sqlite = new Database(":memory:");
		sqlite.exec(
			"CREATE TABLE document (id TEXT PRIMARY KEY, title TEXT NOT NULL, updatedAt TEXT NOT NULL)",
		);
		const client = new Kysely({
			dialect: new SqliteDialect({ database: sqlite }),
		});
		try {
			const adapter = createKyselyAdapter(client, definition, {
				type: "sqlite",
			})({});
			for (const title of ["matching", "matching", "other"]) {
				await adapter.create({
					model: "document",
					data: { title, updatedAt: new Date() },
				});
			}
			await adapter.consumeOne({
				model: "document",
				where: [{ field: "title", value: "missing" }],
			});
			expect(await adapter.count({ model: "document" })).toBe(3);
			await adapter.consumeOne({
				model: "document",
				where: [{ field: "title", value: "matching" }],
			});
			expect(await adapter.count({ model: "document" })).toBe(2);
			expect(
				await adapter.count({
					model: "document",
					where: [{ field: "title", value: "other" }],
				}),
			).toBe(1);
		} finally {
			await client.destroy();
		}
	});
});
