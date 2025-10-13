import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: [
		"@btst/db",
		"better-auth",
		"kysely",
		"drizzle-orm",
		"@prisma/client",
	],
	declaration: true,
	rollup: {
		emitCJS: false,
	},
});
