import { describe, it, expect } from "vitest";
import { defineDb, createDbPlugin } from "@btst/db";

/**
 * Tests for better-db schema definition
 * (ORM generation is tested in generate-all-orms.test.ts)
 */
describe("better-db schema definition", () => {
	it("should create better-db schema correctly", () => {
		const db = defineDb({
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
				},
			},
		});

		const schema = db.getSchema();
		expect(schema).toBeDefined();
		expect(schema.post).toBeDefined();
		expect(schema.post?.fields.title).toBeDefined();
	});

	it("should return schema in Better Auth format", () => {
		const db = defineDb({
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
					published: {
						type: "boolean",
						defaultValue: false,
					},
				},
			},
		});

		const schema = db.getSchema();
		expect(schema).toBeDefined();
		expect(schema.post).toBeDefined();
		expect(schema.post?.fields).toBeDefined();
		expect(schema.post?.fields?.title?.required).toBe(true);
		expect(schema.post?.fields?.published?.defaultValue).toBe(false);
	});

	it("should handle plugins in schema", () => {
		const plugin = createDbPlugin("test", {
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

		const db = defineDb({
			post: {
				modelName: "post",
				fields: {
					title: {
						type: "string",
						required: true,
					},
				},
			},
		}).use(plugin);

		const schema = db.getSchema();
		expect(schema).toBeDefined();

		// Verify both tables exist
		expect(Object.keys(schema)).toContain("post");
		expect(Object.keys(schema)).toContain("comment");

		// Verify model names are correct
		expect(schema.post?.modelName).toBe("post");
		expect(schema.comment?.modelName).toBe("comment");
	});

	it("should preserve field attributes", () => {
		const db = defineDb({
			user: {
				modelName: "user",
				fields: {
					email: {
						type: "string",
						required: true,
						unique: true,
					},
					name: {
						type: "string",
						required: false,
					},
					age: {
						type: "number",
						defaultValue: 0,
					},
				},
			},
		});

		const schema = db.getSchema();

		// Verify attributes are preserved
		expect(schema.user?.fields?.email?.required).toBe(true);
		expect(schema.user?.fields?.email?.unique).toBe(true);
		expect(schema.user?.fields?.name?.required).toBe(false);
		expect(schema.user?.fields?.age?.defaultValue).toBe(0);
	});

	it("should handle references correctly", () => {
		const db = defineDb({
			post: {
				modelName: "post",
				fields: {
					authorId: {
						type: "string",
						required: true,
						references: {
							model: "author",
							field: "id",
							onDelete: "cascade",
						},
					},
					categoryId: {
						type: "string",
						required: false,
						references: {
							model: "category",
							field: "id",
							onDelete: "cascade",
						},
					},
				},
			},
		});

		const schema = db.getSchema();

		// Verify references
		expect(schema.post?.fields?.authorId?.references).toBeDefined();
		expect(schema.post?.fields?.authorId?.references?.model).toBe("author");
		expect(schema.post?.fields?.authorId?.references?.field).toBe("id");
		expect(schema.post?.fields?.authorId?.references?.onDelete).toBe("cascade");

		expect(schema.post?.fields?.categoryId?.references).toBeDefined();
		expect(schema.post?.fields?.categoryId?.references?.model).toBe("category");
		expect(schema.post?.fields?.categoryId?.references?.field).toBe("id");
	});

	it("should merge multiple plugins correctly", () => {
		const plugin1 = createDbPlugin("plugin1", {
			table1: {
				modelName: "table1",
				fields: {
					name: {
						type: "string",
						required: true,
					},
				},
			},
		});

		const plugin2 = createDbPlugin("plugin2", {
			table2: {
				modelName: "table2",
				fields: {
					value: {
						type: "number",
						defaultValue: 0,
					},
				},
			},
		});

		const db = defineDb({
			main: {
				modelName: "main",
				fields: {},
			},
		})
			.use(plugin1)
			.use(plugin2);

		const schema = db.getSchema();

		expect(Object.keys(schema)).toContain("main");
		expect(Object.keys(schema)).toContain("table1");
		expect(Object.keys(schema)).toContain("table2");
	});

	it("should handle all field types correctly", () => {
		const db = defineDb({
			allTypes: {
				modelName: "all_types",
				fields: {
					textField: {
						type: "string",
					},
					stringField: {
						type: "string",
					},
					numberField: {
						type: "number",
					},
					intField: {
						type: "number",
					},
					boolField: {
						type: "boolean",
					},
					dateField: {
						type: "date",
					},
					timestampField: {
						type: "date",
					},
					jsonField: {
						type: "json",
					},
				},
			},
		});

		const schema = db.getSchema();
		const fields = schema?.allTypes?.fields;

		expect(fields?.textField?.type).toBe("string");
		expect(fields?.stringField?.type).toBe("string");
		expect(fields?.numberField?.type).toBe("number");
		expect(fields?.intField?.type).toBe("number");
		expect(fields?.boolField?.type).toBe("boolean");
		expect(fields?.dateField?.type).toBe("date");
		expect(fields?.timestampField?.type).toBe("date");
		expect(fields?.jsonField?.type).toBe("json");
	});
});
