import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageManifest {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

const btstPackageDirectories = [
	"adapter-drizzle",
	"adapter-kysely",
	"adapter-memory",
	"adapter-mongodb",
	"adapter-prisma",
	"cli",
	"db",
	"plugins",
] as const;

const betterAuthConsumers = [
	"adapter-drizzle",
	"adapter-kysely",
	"adapter-memory",
	"adapter-mongodb",
	"adapter-prisma",
	"cli",
] as const;

async function readManifest(directory: string): Promise<PackageManifest> {
	const path = resolve(process.cwd(), "..", directory, "package.json");
	return JSON.parse(await readFile(path, "utf8"));
}

describe("BTST package dependency alignment", () => {
	/**
	 * @see https://github.com/better-stack-ai/better-stack/issues/163
	 */
	it("publishes one BTST patch version", async () => {
		const manifests = await Promise.all(
			btstPackageDirectories.map(readManifest),
		);

		for (const manifest of manifests) {
			expect(manifest.version, manifest.name).toBe("2.2.3");
		}
	});

	/**
	 * @see https://github.com/better-stack-ai/better-stack/issues/163
	 */
	it("shares the exact Better Auth type universe with consumers", async () => {
		const dbManifest = await readManifest("db");

		expect(dbManifest.dependencies ?? {}).not.toHaveProperty("better-auth");
		expect(dbManifest.dependencies ?? {}).not.toHaveProperty(
			"@better-auth/core",
		);
		expect(dbManifest.dependencies ?? {}).not.toHaveProperty(
			"@better-auth/utils",
		);
		expect(dbManifest.peerDependencies).toMatchObject({
			"@better-auth/core": "1.6.16",
			"@better-auth/utils": "0.4.1",
			"better-auth": "1.6.16",
		});
		expect(dbManifest.devDependencies).toMatchObject({
			"@better-auth/core": "workspace:*",
			"@better-auth/utils": "catalog:",
			"better-auth": "workspace:*",
		});

		for (const directory of betterAuthConsumers) {
			const manifest = await readManifest(directory);
			expect(manifest.peerDependencies, manifest.name).toMatchObject({
				"@better-auth/core": "1.6.16",
				"@better-auth/utils": "0.4.1",
				"better-auth": "1.6.16",
			});
		}
	});
});
