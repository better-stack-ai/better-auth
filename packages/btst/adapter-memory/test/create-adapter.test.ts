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
