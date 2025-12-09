import { describe, it, expect } from "vitest";
import { defineDb } from "@btst/db";
import { createMemoryAdapter } from "../src/index";
import { webcrypto } from "node:crypto";

// Mock crypto for tests
if (!globalThis.crypto) {
	globalThis.crypto = webcrypto as any;
}

describe("createMemoryAdapter helper", () => {
	it("should create a memory adapter from Better DB schema", () => {
		const db = defineDb({
			todo: {
				modelName: "todo",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					completed: {
						type: "boolean",
						defaultValue: false,
					},
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db);

		expect(adapterFactory).toBeDefined();
		expect(typeof adapterFactory).toBe("function");
	});

	it("should allow querying with model names", async () => {
		const db = defineDb({
			todo: {
				modelName: "todo",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					completed: {
						type: "boolean",
						defaultValue: false,
					},
				},
			},
			message: {
				modelName: "message",
				fields: {
					content: {
						type: "string",
						required: true,
					},
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db);

		const adapter = adapterFactory({});

		// Create a todo
		const todo = await adapter.create<{
			title: string;
			completed: boolean;
		}>({
			model: "todo",
			data: {
				title: "Test Todo",
				completed: false,
			},
		});

		expect(todo).toBeDefined();
		expect(todo.title).toBe("Test Todo");

		// Query todos
		const todos = await adapter.findMany<{
			title: string;
			completed: boolean;
		}>({
			model: "todo",
		});

		expect(todos).toBeDefined();
		expect(todos.length).toBe(1);
		expect(todos[0]?.title).toBe("Test Todo");
	});

	it("should support sorting and filtering", async () => {
		const db = defineDb({
			todo: {
				modelName: "todo",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					completed: {
						type: "boolean",
						defaultValue: false,
					},
					createdAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db);

		const adapter = adapterFactory({});

		// Create multiple todos
		await adapter.create({
			model: "todo",
			data: {
				title: "First Todo",
				completed: false,
				createdAt: new Date("2024-01-01"),
			},
		});

		await adapter.create({
			model: "todo",
			data: {
				title: "Second Todo",
				completed: true,
				createdAt: new Date("2024-01-02"),
			},
		});

		// Query with sorting
		const todos = await adapter.findMany<{
			title: string;
			completed: boolean;
			createdAt: Date;
		}>({
			model: "todo",
			sortBy: {
				field: "createdAt",
				direction: "desc",
			},
		});

		expect(todos).toBeDefined();
		expect(todos.length).toBe(2);
		expect(todos[0]?.title).toBe("Second Todo");
		expect(todos[1]?.title).toBe("First Todo");
	});

	it("should work with multiple tables", async () => {
		const db = defineDb({
			todo: {
				modelName: "todo",
				fields: {
					title: {
						type: "string",
						required: true,
					},
				},
			},
			message: {
				modelName: "message",
				fields: {
					content: {
						type: "string",
						required: true,
					},
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db);

		const adapter = adapterFactory({});

		// Create in both tables
		await adapter.create({
			model: "todo",
			data: { title: "My Todo" },
		});

		await adapter.create({
			model: "message",
			data: { content: "My Message" },
		});

		// Query both tables
		const todos = await adapter.findMany<{
			title: string;
		}>({ model: "todo" });
		const messages = await adapter.findMany<{
			content: string;
		}>({ model: "message" });

		expect(todos.length).toBe(1);
		expect(messages.length).toBe(1);
		expect(todos[0]?.title).toBe("My Todo");
		expect(messages[0]?.content).toBe("My Message");
	});
});

describe("createMemoryAdapter with experimental joins", () => {
	it("should support one-to-one joins", async () => {
		const db = defineDb({
			author: {
				modelName: "author",
				fields: {
					name: {
						type: "string",
						required: true,
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
						unique: true,
						references: {
							model: "author",
							field: "id",
							onDelete: "cascade",
						},
					},
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db, {
			experimental: {
				joins: true,
			},
		});

		const adapter = adapterFactory({
			experimental: {
				joins: true,
			},
		});

		// Create author and profile
		const author = await adapter.create({
			model: "author",
			data: { name: "Jane Doe" },
		});

		await adapter.create({
			model: "profile",
			data: { bio: "Award-winning writer", authorId: author.id },
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
		expect((result as any).name).toBe("Jane Doe");
		expect((result as any).profile).toBeDefined();
		expect((result as any).profile.bio).toBe("Award-winning writer");
	});

	it("should support one-to-many joins", async () => {
		const db = defineDb({
			author: {
				modelName: "author",
				fields: {
					name: {
						type: "string",
						required: true,
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
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db, {
			experimental: {
				joins: true,
			},
		});

		const adapter = adapterFactory({
			experimental: {
				joins: true,
			},
		});

		// Create author and books
		const author = await adapter.create({
			model: "author",
			data: { name: "John Smith" },
		});

		await adapter.create({
			model: "book",
			data: { title: "Book One", authorId: author.id },
		});

		await adapter.create({
			model: "book",
			data: { title: "Book Two", authorId: author.id },
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
		expect((result as any).name).toBe("John Smith");
		expect((result as any).book).toBeDefined();
		expect(Array.isArray((result as any).book)).toBe(true);
		expect((result as any).book.length).toBe(2);
	});

	it("should respect limit on one-to-many joins", async () => {
		const db = defineDb({
			author: {
				modelName: "author",
				fields: {
					name: {
						type: "string",
						required: true,
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
				},
			},
		});

		const adapterFactory = createMemoryAdapter(db, {
			experimental: {
				joins: true,
			},
		});

		const adapter = adapterFactory({
			experimental: {
				joins: true,
			},
		});

		// Create author and many books
		const author = await adapter.create({
			model: "author",
			data: { name: "Prolific Writer" },
		});

		for (let i = 1; i <= 10; i++) {
			await adapter.create({
				model: "book",
				data: { title: `Book ${i}`, authorId: author.id },
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
		expect((result as any).book).toBeDefined();
		expect(Array.isArray((result as any).book)).toBe(true);
		expect((result as any).book.length).toBe(3);
	});
});
