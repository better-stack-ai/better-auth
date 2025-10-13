import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index"],
	externals: ["better-auth", "@better-auth/core"],
	declaration: true,
	rollup: {
		emitCJS: true,
	},
});
