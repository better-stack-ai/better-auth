import path from "node:path";
import { config } from "dotenv";

function getEnvironmentMode(): "development" | "production" | "test" {
	if (process.env.NODE_ENV === "production") return "production";
	if (process.env.NODE_ENV === "test") return "test";
	return "development";
}

/** Loads environment files with the same precedence used by Next.js projects. */
export function loadProjectEnv(cwd: string): void {
	const mode = getEnvironmentMode();
	const fileNames = [
		`.env.${mode}.local`,
		...(mode === "test" ? [] : [".env.local"]),
		`.env.${mode}`,
		".env",
	];

	config({
		path: fileNames.map((fileName) => path.join(cwd, fileName)),
		quiet: true,
	});
}
