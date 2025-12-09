import { describe, it, expect, beforeEach } from "vitest";
import { defineDb } from "../src/define-db";
import { memoryAdapter } from "better-auth/adapters/memory";
import { webcrypto } from "node:crypto";

// Mock crypto for tests
if (!globalThis.crypto) {
	globalThis.crypto = webcrypto as any;
}

describe("Joins Support - Memory Adapter", () => {
	let schema: any;
	let memoryDB: Record<string, any[]>;
	let adapter: any;

	beforeEach(() => {
		// Define a schema with relationships for join testing
		const db = defineDb({
			author: {
				modelName: "author",
				fields: {
					name: {
						type: "string",
						required: true,
					},
					email: {
						type: "string",
						required: true,
						unique: true,
					},
				},
			},
			profile: {
				modelName: "profile",
				fields: {
					bio: {
						type: "string",
						required: false,
					},
					authorId: {
						type: "string",
						required: true,
						unique: true, // One-to-one relationship
						references: {
							model: "author",
							field: "id",
							onDelete: "cascade",
						},
					},
				},
			},
			book: {
				modelName: "book",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					authorId: {
						type: "string",
						required: true,
						references: {
							model: "author",
							field: "id",
							onDelete: "cascade",
						},
					},
					publishedAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
				},
			},
		});

		schema = db.getSchema();
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		// Create adapter with experimental joins enabled
		const options = {
			experimental: {
				joins: true,
			},
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);
	});

	describe("findOne with joins", () => {
		it("should join one-to-one relationships", async () => {
			// Create an author
			const author = await adapter.create({
				model: "author",
				data: {
					name: "Jane Doe",
					email: "jane@example.com",
				},
			});

			// Create a profile for the author (one-to-one)
			await adapter.create({
				model: "profile",
				data: {
					bio: "Award-winning novelist",
					authorId: author.id,
				},
			});

			// Find author with profile joined using correct JoinOption shape
			const result = await adapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					profile: true,
				},
			});

			expect(result).toBeDefined();
			expect(result.name).toBe("Jane Doe");
			expect(result.profile).toBeDefined();
			expect(result.profile.bio).toBe("Award-winning novelist");
		});

		it("should join one-to-many relationships", async () => {
			// Create an author
			const author = await adapter.create({
				model: "author",
				data: {
					name: "John Smith",
					email: "john@example.com",
				},
			});

			// Create multiple books for the author (one-to-many)
			await adapter.create({
				model: "book",
				data: {
					title: "Book One",
					authorId: author.id,
					publishedAt: new Date("2023-01-01"),
				},
			});

			await adapter.create({
				model: "book",
				data: {
					title: "Book Two",
					authorId: author.id,
					publishedAt: new Date("2023-06-01"),
				},
			});

			// Find author with books joined using correct JoinOption shape
			const result = await adapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					book: true,
				},
			});

			expect(result).toBeDefined();
			expect(result.name).toBe("John Smith");
			expect(result.book).toBeDefined();
			expect(Array.isArray(result.book)).toBe(true);
			expect(result.book.length).toBe(2);
			expect(result.book.map((b: any) => b.title).sort()).toEqual([
				"Book One",
				"Book Two",
			]);
		});

		it("should return null for joined data when no related records exist", async () => {
			// Create an author without a profile
			const author = await adapter.create({
				model: "author",
				data: {
					name: "Solo Author",
					email: "solo@example.com",
				},
			});

			// Find author with profile joined (but no profile exists)
			const result = await adapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					profile: true,
				},
			});

			expect(result).toBeDefined();
			expect(result.name).toBe("Solo Author");
			expect(result.profile).toBeNull();
		});

		it("should return empty array for one-to-many when no related records exist", async () => {
			// Create an author without books
			const author = await adapter.create({
				model: "author",
				data: {
					name: "New Author",
					email: "new@example.com",
				},
			});

			// Find author with books joined (but no books exist)
			const result = await adapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					book: true,
				},
			});

			expect(result).toBeDefined();
			expect(result.name).toBe("New Author");
			expect(result.book).toBeDefined();
			expect(Array.isArray(result.book)).toBe(true);
			expect(result.book.length).toBe(0);
		});
	});

	describe("findMany with joins", () => {
		it("should join one-to-many relationships for multiple results", async () => {
			// Create two authors
			const author1 = await adapter.create({
				model: "author",
				data: {
					name: "Author One",
					email: "author1@example.com",
				},
			});

			const author2 = await adapter.create({
				model: "author",
				data: {
					name: "Author Two",
					email: "author2@example.com",
				},
			});

			// Create books for each author
			await adapter.create({
				model: "book",
				data: {
					title: "Author 1 Book 1",
					authorId: author1.id,
					publishedAt: new Date(),
				},
			});

			await adapter.create({
				model: "book",
				data: {
					title: "Author 1 Book 2",
					authorId: author1.id,
					publishedAt: new Date(),
				},
			});

			await adapter.create({
				model: "book",
				data: {
					title: "Author 2 Book 1",
					authorId: author2.id,
					publishedAt: new Date(),
				},
			});

			// Find all authors with books joined using correct JoinOption shape
			const results = await adapter.findMany({
				model: "author",
				join: {
					book: true,
				},
			});

			expect(results).toBeDefined();
			expect(results.length).toBe(2);

			// Find the specific authors in results
			const resultAuthor1 = results.find(
				(a: any) => a.email === "author1@example.com",
			);
			const resultAuthor2 = results.find(
				(a: any) => a.email === "author2@example.com",
			);

			expect(resultAuthor1).toBeDefined();
			expect(resultAuthor1.book.length).toBe(2);

			expect(resultAuthor2).toBeDefined();
			expect(resultAuthor2.book.length).toBe(1);
		});

		it("should respect limit on joined one-to-many relationships", async () => {
			// Create an author
			const author = await adapter.create({
				model: "author",
				data: {
					name: "Prolific Author",
					email: "prolific@example.com",
				},
			});

			// Create many books
			for (let i = 1; i <= 10; i++) {
				await adapter.create({
					model: "book",
					data: {
						title: `Book ${i}`,
						authorId: author.id,
						publishedAt: new Date(),
					},
				});
			}

			// Find author with books joined, limited to 3 using correct JoinOption shape
			const result = await adapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					book: { limit: 3 },
				},
			});

			expect(result).toBeDefined();
			expect(result.book).toBeDefined();
			expect(Array.isArray(result.book)).toBe(true);
			expect(result.book.length).toBe(3);
		});
	});

	describe("experimental joins configuration", () => {
		it("should have experimental joins enabled", () => {
			// The memory adapter should work with experimental: { joins: true }
			// This test verifies the adapter is properly configured
			expect(adapter).toBeDefined();
			expect(adapter.findOne).toBeDefined();
			expect(adapter.findMany).toBeDefined();
		});

		it("should work without experimental joins (fallback mode)", async () => {
			// Create adapter without experimental joins
			const fallbackAdapter = memoryAdapter(memoryDB)({
				plugins: [
					{
						id: "better-db-schema",
						schema: schema,
					},
				],
			} as any);

			// Create an author
			const author = await fallbackAdapter.create({
				model: "author",
				data: {
					name: "Fallback Author",
					email: "fallback@example.com",
				},
			});

			// Create a book
			await fallbackAdapter.create({
				model: "book",
				data: {
					title: "Fallback Book",
					authorId: author.id,
					publishedAt: new Date(),
				},
			});

			// Find author with books joined - should still work via fallback
			// Using correct JoinOption shape
			const result = await fallbackAdapter.findOne({
				model: "author",
				where: [{ field: "id", value: author.id }],
				join: {
					book: true,
				},
			});

			expect(result).toBeDefined();
			expect((result as any).name)?.toBe("Fallback Author");
			// In fallback mode, joins are handled by the factory making separate queries
			expect((result as any).book)?.toBeDefined();
		});
	});
});
