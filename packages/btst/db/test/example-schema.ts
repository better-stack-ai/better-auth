import { defineDb } from "../src/index";
import { todoPlugin } from "../../plugins/src/todo";

// Test the defineDb with new object syntax
export const blogDb = defineDb({
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
}).use(todoPlugin); // Test plugin system

export default blogDb;
