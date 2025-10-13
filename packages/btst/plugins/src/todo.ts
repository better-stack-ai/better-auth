import { createDbPlugin } from "@btst/db";

/**
 * Todo plugin - adds a todos table to any schema for testing purposes
 *
 * Usage:
 * ```ts
 * import { defineDb } from "@btst/db";
 * import { todoPlugin } from "@btst/plugins";
 *
 * const db = defineDb({
 *   post: {
 *     modelName: "post",
 *     fields: { title: { type: "string", required: true } },
 *   },
 * }).use(todoPlugin);
 * ```
 */
export const todoPlugin = createDbPlugin("todo", {
	todo: {
		modelName: "todo",
		fields: {
			title: {
				type: "string",
				required: true,
			},
			description: {
				type: "string",
				required: false,
			},
			completed: {
				type: "boolean",
				defaultValue: false,
			},
			userId: {
				type: "string",
				required: true,
			},
			createdAt: {
				type: "date",
				defaultValue: () => new Date(),
			},
		},
	},
});
