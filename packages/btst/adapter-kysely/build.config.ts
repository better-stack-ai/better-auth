import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index", "src/node-sqlite-dialect"],
	externals: [
		"better-auth",
		"@better-auth/core",
		/^@better-auth\/core\//,
		"@btst/db",
		"kysely",
		"node:sqlite",
	],
	declaration: true,
	rollup: {
		emitCJS: true,
	},
});
