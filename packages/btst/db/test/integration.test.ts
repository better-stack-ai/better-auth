// Integration test to verify the better-db API works as expected
import { describe, it, expect } from "vitest";
import { defineDb, createDbPlugin } from "../src/index";

describe("better-db integration", () => {
	it("should create schema with defineDb", () => {
		const blogDb = defineDb({
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					body: {
						type: "string",
						required: true,
					},
					authorId: {
						type: "string",
						required: true,
					},
					published: {
						type: "boolean",
						defaultValue: false,
					},
					createdAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
					updatedAt: {
						type: "date",
						defaultValue: () => new Date(),
					},
				},
			},
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
					bio: {
						type: "string",
						required: false,
					},
				},
			},
		});

		const schema = blogDb.getSchema();
		expect(schema).toBeDefined();
		expect(Object.keys(schema)).toContain("post");
		expect(Object.keys(schema)).toContain("author");
	});

	it("should add plugin tables to schema", () => {
		// Create a simple test plugin inline
		const testPlugin = createDbPlugin("test", {
			comment: {
				modelName: "comment",
				fields: {
					content: {
						type: "string",
						required: true,
					},
				},
			},
		});

		const blogDb = defineDb({
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
				},
			},
		}).use(testPlugin);

		const schema = blogDb.getSchema();
		expect(Object.keys(schema)).toContain("post");
		expect(Object.keys(schema)).toContain("comment");
	});

	it("should create correct field attributes", () => {
		const blogDb = defineDb({
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					email: {
						type: "string",
						unique: true,
					},
				},
			},
		});

		const schema = blogDb.getSchema();
		const postTable = schema.post;

		expect(postTable).toBeDefined();
		expect(postTable.fields.title.required).toBe(true);
		expect(postTable.fields.email.unique).toBe(true);
	});

	it("should support plugins via options", () => {
		const testPlugin = createDbPlugin("test", {
			tag: {
				modelName: "tag",
				fields: {
					name: {
						type: "string",
						required: true,
					},
				},
			},
		});

		const blogDb = defineDb(
			{
				post: {
					modelName: "post",
					fields: {
						title: {
							type: "string",
							required: true,
						},
					},
				},
			},
			{ plugins: [testPlugin] },
		);

		const schema = blogDb.getSchema();
		expect(Object.keys(schema)).toContain("post");
		expect(Object.keys(schema)).toContain("tag");
	});
});
