import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: [
		"better-auth",
		"@better-auth/core",
		"@btst/db",
		"drizzle-orm",
	],
	declaration: true,
	rollup: {
		emitCJS: true,
	},
});
