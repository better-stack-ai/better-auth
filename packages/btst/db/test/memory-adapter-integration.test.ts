import { describe, it, expect, beforeEach } from "vitest";
import { defineDb, type DatabaseDefinition } from "../src/define-db";
import { memoryAdapter } from "better-auth/adapters/memory";
import { webcrypto } from "node:crypto";

// Mock crypto for tests
if (!globalThis.crypto) {
	globalThis.crypto = webcrypto as any;
}

describe("Memory Adapter Integration with Better DB", () => {
	let db: DatabaseDefinition;
	let schema: any;
	let memoryDB: Record<string, any[]>;
	let adapter: any;

	beforeEach(() => {
		// Define a schema similar to the user's
		db = defineDb({
			message: {
				modelName: "message",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					content: {
						type: "string",
						required: true,
					},
					createdAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
				},
			},
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

		// Get Better Auth schema
		schema = db.getSchema();
	});

	it("should get Better DB schema in Better Auth format correctly", () => {
		expect(schema).toBeDefined();
		expect(Object.keys(schema)).toContain("todo");
		expect(Object.keys(schema)).toContain("message");

		// Check todo table structure
		expect(schema.todo).toBeDefined();
		expect(schema.todo.modelName).toBe("todo");
		expect(schema.todo.fields).toBeDefined();

		// Check message table structure
		expect(schema.message).toBeDefined();
		expect(schema.message.modelName).toBe("message");
		expect(schema.message.fields).toBeDefined();
	});

	it("should initialize memory DB with correct model names", () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		expect(memoryDB).toBeDefined();
		expect(Object.keys(memoryDB)).toContain("todo");
		expect(Object.keys(memoryDB)).toContain("message");
		expect(memoryDB.todo).toEqual([]);
		expect(memoryDB.message).toEqual([]);
	});

	it("should have lowercase keys in memory DB", () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		// Keys should be lowercase (modelName)
		expect(Object.keys(memoryDB)).toContain("todo");
		expect(Object.keys(memoryDB)).toContain("message");
	});

	it("should create adapter with minimal options including schema", () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		// Create adapter with options including schema
		// Schema needs to be in a plugin, not directly in options
		const options = {
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);

		expect(adapter).toBeDefined();
		expect(adapter.create).toBeDefined();
		expect(adapter.findOne).toBeDefined();
		expect(adapter.findMany).toBeDefined();
	});

	it("should be able to create a record using model name", async () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		const options = {
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);

		// Create with schema key "todo"
		const todo = await adapter.create({
			model: "todo",
			data: {
				title: "Test Todo",
				completed: false,
				createdAt: new Date(),
			},
		});

		expect(todo).toBeDefined();
		expect(todo.title).toBe("Test Todo");
	});

	it("should be able to query with model name", async () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		const options = {
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);

		// Create a todo first
		await adapter.create({
			model: "todo",
			data: {
				title: "Test Todo",
				completed: false,
				createdAt: new Date(),
			},
		});

		// Now try to query with "todo"
		const todos = await adapter.findMany({
			model: "todo",
			sortBy: {
				field: "createdAt",
				direction: "desc",
			},
		});

		expect(todos).toBeDefined();
		expect(todos.length).toBe(1);
		expect(todos[0].title).toBe("Test Todo");
	});

	it("should reproduce the user's error scenario", async () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		// User was passing empty object - this is likely the issue
		const emptyOptions = {};

		adapter = memoryAdapter(memoryDB)(emptyOptions as any);

		// This should fail with "Model 'todo' not found in schema"
		await expect(async () => {
			await adapter.findMany({
				model: "todo",
				sortBy: {
					field: "createdAt",
					direction: "desc",
				},
			});
		}).rejects.toThrow();
	});

	it("should work with model names", async () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		const options = {
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);

		await adapter.create({
			model: "todo",
			data: {
				title: "Test Todo",
				completed: false,
				createdAt: new Date(),
			},
		});

		// Query with lowercase
		const todos = await adapter.findMany({
			model: "todo",
			sortBy: {
				field: "createdAt",
				direction: "desc",
			},
		});

		expect(todos).toBeDefined();
		expect(todos.length).toBe(1);
	});

	it("should demonstrate schema key equals modelName now", () => {
		const schemaEntries = Object.entries(schema);

		for (const [schemaKey, tableConfig] of schemaEntries) {
			const modelName = (tableConfig as any).modelName;

			console.log(`Schema Key: "${schemaKey}", Model Name: "${modelName}"`);

			// Both should be lowercase now
			expect(schemaKey).toMatch(/^[a-z]/);
			expect(modelName).toMatch(/^[a-z]/);

			// They should be the same
			expect(schemaKey).toBe(modelName);
		}
	});

	it("should check what keys are in memoryDB after initialization", () => {
		memoryDB = {};
		for (const [key, tableConfig] of Object.entries(schema)) {
			const tableName = (tableConfig as any).modelName || key;
			memoryDB[tableName] = [];
		}

		console.log("Memory DB keys:", Object.keys(memoryDB));
		console.log("Schema keys:", Object.keys(schema));

		// Memory DB and schema should have same lowercase keys
		expect(Object.keys(memoryDB)).toEqual(["message", "todo"]);
		expect(Object.keys(schema)).toEqual(["message", "todo"]);
	});
});

describe("Memory Adapter with Foreign Key Relationships", () => {
	let db: ReturnType<typeof defineDb>;
	let schema: any;
	let memoryDB: Record<string, any[]>;
	let adapter: any;

	beforeEach(() => {
		// Define a schema with foreign key relationships
		db = defineDb({
			user: {
				modelName: "user",
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
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					content: {
						type: "string",
						required: true,
					},
					authorId: {
						type: "string",
						required: true,
						references: {
							model: "user",
							field: "id",
							onDelete: "cascade",
						},
					},
					createdAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
				},
			},
			comment: {
				modelName: "comment",
				fields: {
					content: {
						type: "string",
						required: true,
					},
					postId: {
						type: "string",
						required: true,
						references: {
							model: "post",
							field: "id",
							onDelete: "cascade",
						},
					},
					authorId: {
						type: "string",
						required: true,
						references: {
							model: "user",
							field: "id",
							onDelete: "cascade",
						},
					},
					createdAt: {
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

		const options = {
			plugins: [
				{
					id: "better-db-schema",
					schema: schema,
				},
			],
		};

		adapter = memoryAdapter(memoryDB)(options as any);
	});

	it("should define foreign key relationships in schema", () => {
		expect(schema.post).toBeDefined();
		expect(schema.post.fields.authorId).toBeDefined();
		expect(schema.post.fields.authorId.references).toBeDefined();
		expect(schema.post.fields.authorId.references.model).toBe("user");
		expect(schema.post.fields.authorId.references.field).toBe("id");

		expect(schema.comment).toBeDefined();
		expect(schema.comment.fields.postId).toBeDefined();
		expect(schema.comment.fields.postId.references).toBeDefined();
		expect(schema.comment.fields.postId.references.model).toBe("post");

		expect(schema.comment.fields.authorId).toBeDefined();
		expect(schema.comment.fields.authorId.references).toBeDefined();
		expect(schema.comment.fields.authorId.references.model).toBe("user");
	});

	it("should create records with foreign key relationships", async () => {
		// Create a user
		const user = await adapter.create({
			model: "user",
			data: {
				name: "John Doe",
				email: "john@example.com",
			},
		});

		expect(user).toBeDefined();
		expect(user.id).toBeDefined();
		expect(user.name).toBe("John Doe");

		// Create a post referencing the user
		const post = await adapter.create({
			model: "post",
			data: {
				title: "My First Post",
				content: "This is the content",
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		expect(post).toBeDefined();
		expect(post.id).toBeDefined();
		expect(post.authorId).toBe(user.id);

		// Create a comment referencing both post and user
		const comment = await adapter.create({
			model: "comment",
			data: {
				content: "Great post!",
				postId: post.id,
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		expect(comment).toBeDefined();
		expect(comment.postId).toBe(post.id);
		expect(comment.authorId).toBe(user.id);
	});

	it("should query related records using foreign keys", async () => {
		// Create test data
		const user = await adapter.create({
			model: "user",
			data: {
				name: "Jane Smith",
				email: "jane@example.com",
			},
		});

		const post1 = await adapter.create({
			model: "post",
			data: {
				title: "Post 1",
				content: "Content 1",
				authorId: user.id,
				createdAt: new Date("2024-01-01"),
			},
		});

		const post2 = await adapter.create({
			model: "post",
			data: {
				title: "Post 2",
				content: "Content 2",
				authorId: user.id,
				createdAt: new Date("2024-01-02"),
			},
		});

		await adapter.create({
			model: "comment",
			data: {
				content: "Comment on post 1",
				postId: post1.id,
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		await adapter.create({
			model: "comment",
			data: {
				content: "Comment on post 2",
				postId: post2.id,
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		// Query posts by author
		const userPosts = await adapter.findMany({
			model: "post",
			where: [{ field: "authorId", value: user.id }],
		});

		expect(userPosts.length).toBe(2);
		expect(userPosts.every((p: any) => p.authorId === user.id)).toBe(true);

		// Query comments by post
		const post1Comments = await adapter.findMany({
			model: "comment",
			where: [{ field: "postId", value: post1.id }],
		});

		expect(post1Comments.length).toBe(1);
		expect(post1Comments[0].content).toBe("Comment on post 1");
	});

	it("should support multiple foreign keys to the same table", async () => {
		// Create two users
		const author = await adapter.create({
			model: "user",
			data: {
				name: "Author",
				email: "author@example.com",
			},
		});

		const commenter = await adapter.create({
			model: "user",
			data: {
				name: "Commenter",
				email: "commenter@example.com",
			},
		});

		// Create a post by author
		const post = await adapter.create({
			model: "post",
			data: {
				title: "Author's Post",
				content: "Written by author",
				authorId: author.id,
				createdAt: new Date(),
			},
		});

		// Create a comment by a different user
		const comment = await adapter.create({
			model: "comment",
			data: {
				content: "Comment by another user",
				postId: post.id,
				authorId: commenter.id, // Different user than post author
				createdAt: new Date(),
			},
		});

		// Verify the relationships
		expect(post.authorId).toBe(author.id);
		expect(comment.authorId).toBe(commenter.id);
		expect(comment.postId).toBe(post.id);

		// Query to ensure they're different
		const postAuthor = await adapter.findOne({
			model: "user",
			where: [{ field: "id", value: post.authorId }],
		});

		const commentAuthor = await adapter.findOne({
			model: "user",
			where: [{ field: "id", value: comment.authorId }],
		});

		expect(postAuthor.email).toBe("author@example.com");
		expect(commentAuthor.email).toBe("commenter@example.com");
	});

	it("should handle cascading relationships", async () => {
		// Create a chain of related records
		const user = await adapter.create({
			model: "user",
			data: {
				name: "Test User",
				email: "test@example.com",
			},
		});

		const post = await adapter.create({
			model: "post",
			data: {
				title: "Test Post",
				content: "Test Content",
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		const comment = await adapter.create({
			model: "comment",
			data: {
				content: "Test Comment",
				postId: post.id,
				authorId: user.id,
				createdAt: new Date(),
			},
		});

		// Verify the chain
		expect(comment.postId).toBe(post.id);
		expect(post.authorId).toBe(user.id);
		expect(comment.authorId).toBe(user.id);

		// Delete the post
		await adapter.delete({
			model: "post",
			where: [{ field: "id", value: post.id }],
		});

		// Verify post is deleted
		const deletedPost = await adapter.findOne({
			model: "post",
			where: [{ field: "id", value: post.id }],
		});

		expect(deletedPost).toBeNull();

		// Comment still exists (memory adapter doesn't enforce cascade deletes)
		// This is a limitation of the memory adapter - just documenting the behavior
		const existingComment = await adapter.findOne({
			model: "comment",
			where: [{ field: "id", value: comment.id }],
		});

		expect(existingComment).toBeDefined();
		// In a real database with CASCADE, this comment would be deleted
	});

	it("should support querying with complex where clauses on foreign keys", async () => {
		// Create multiple users and posts
		const user1 = await adapter.create({
			model: "user",
			data: { name: "User 1", email: "user1@example.com" },
		});

		const user2 = await adapter.create({
			model: "user",
			data: { name: "User 2", email: "user2@example.com" },
		});

		await adapter.create({
			model: "post",
			data: {
				title: "User 1 Post 1",
				content: "Content",
				authorId: user1.id,
				createdAt: new Date("2024-01-01"),
			},
		});

		await adapter.create({
			model: "post",
			data: {
				title: "User 1 Post 2",
				content: "Content",
				authorId: user1.id,
				createdAt: new Date("2024-01-02"),
			},
		});

		await adapter.create({
			model: "post",
			data: {
				title: "User 2 Post 1",
				content: "Content",
				authorId: user2.id,
				createdAt: new Date("2024-01-03"),
			},
		});

		// Query posts by multiple authors using "in" operator
		const posts = await adapter.findMany({
			model: "post",
			where: [
				{ field: "authorId", value: [user1.id, user2.id], operator: "in" },
			],
		});

		expect(posts.length).toBe(3);
	});
});
