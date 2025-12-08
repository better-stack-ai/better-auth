import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: [
		"@btst/db",
		"better-auth",
		"@better-auth/core",
		/^@better-auth\/core\//,
		"kysely",
		"drizzle-orm",
		"@prisma/client",
	],
	declaration: true,
	rollup: {
		emitCJS: false,
	},
});
