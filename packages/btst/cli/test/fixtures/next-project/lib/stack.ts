import "server-only";
import { defineDb } from "@btst/db";
import { modelName } from "@/lib/model";

export default defineDb({
	projectWidget: {
		modelName,
		fields: {
			name: { type: "string", required: true },
			createdAt: { type: "date", required: true },
		},
	},
});
