import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Imports a package using the consumer project's dependency graph. */
export async function importProjectModule<Module>(
	specifier: string,
	cwd: string,
): Promise<Module> {
	const projectRequire = createRequire(path.join(cwd, "package.json"));
	let resolved: string;

	try {
		resolved = projectRequire.resolve(specifier);
	} catch (error) {
		throw new Error(
			`Cannot resolve ${specifier} from ${cwd}. Install the matching package in the project before running codegen.`,
			{ cause: error },
		);
	}

	return import(pathToFileURL(resolved).href) as Promise<Module>;
}
