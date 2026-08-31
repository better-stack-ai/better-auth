import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const BTST_CLI_PACKAGE_DIRECTORY = "packages/btst/cli";

interface PackageManifest {
	name?: string;
	version?: string;
}

export interface BtstCliReleasePlan {
	packageDirectory: typeof BTST_CLI_PACKAGE_DIRECTORY;
	packageName: "@btst/cli";
	version: string;
	npmTag: string;
}

export function formatBtstCliReleasePlan(plan: BtstCliReleasePlan): string {
	return (
		[
			`package_directory=${plan.packageDirectory}`,
			`package_name=${plan.packageName}`,
			`version=${plan.version}`,
			`npm_tag=${plan.npmTag}`,
		].join("\n") + "\n"
	);
}

/** Builds a release plan that can only target the @btst/cli package. */
export function createBtstCliReleasePlan(
	releaseTag: string,
	manifest: PackageManifest,
): BtstCliReleasePlan {
	if (!releaseTag.startsWith("btst-cli-v")) {
		throw new Error(
			`CLI release tag must start with btst-cli-v; found ${releaseTag}`,
		);
	}

	const version = releaseTag.slice("btst-cli-v".length);
	if (!version) throw new Error("CLI release tag must include a version");
	if (manifest.name !== "@btst/cli") {
		throw new Error(
			`Release package must be @btst/cli; found ${manifest.name}`,
		);
	}
	if (manifest.version !== version) {
		throw new Error(
			`@btst/cli version (${manifest.version}) does not match tag version (${version})`,
		);
	}

	const prerelease = version.match(/-(next|canary|beta|rc|alpha)(?:\.|$)/);
	return {
		packageDirectory: BTST_CLI_PACKAGE_DIRECTORY,
		packageName: "@btst/cli",
		version,
		npmTag: prerelease?.[1] ?? "latest",
	};
}

function run(): void {
	const releaseTag = process.argv[2];
	if (!releaseTag)
		throw new Error("Usage: btst-cli-release-plan <release-tag>");
	const manifestPath = path.join(BTST_CLI_PACKAGE_DIRECTORY, "package.json");
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	const plan = createBtstCliReleasePlan(releaseTag, manifest);
	const output = formatBtstCliReleasePlan(plan);
	const githubOutput = process.env.GITHUB_OUTPUT;

	if (githubOutput) {
		fs.appendFileSync(githubOutput, output);
		return;
	}

	process.stdout.write(output);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	run();
}
