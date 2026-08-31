import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importProjectModule } from "../src/utils/project-module";

const temporaryDirectories: string[] = [];

async function createConsumerProject(): Promise<string> {
	const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "btst-cli-consumer-"));
	temporaryDirectories.push(cwd);
	await fs.writeFile(
		path.join(cwd, "package.json"),
		'{"name":"consumer","type":"module"}\n',
	);
	return cwd;
}

async function writePackage(
	cwd: string,
	packageName: string,
	files: Record<string, string>,
): Promise<void> {
	const packageDirectory = path.join(cwd, "node_modules", packageName);
	await fs.mkdir(packageDirectory, { recursive: true });
	for (const [fileName, contents] of Object.entries(files)) {
		await fs.writeFile(path.join(packageDirectory, fileName), contents, "utf8");
	}
}

describe("importProjectModule", () => {
	afterEach(async () => {
		await Promise.all(
			temporaryDirectories
				.splice(0)
				.map((directory) => fs.rm(directory, { recursive: true, force: true })),
		);
	});

	/**
	 * @see https://github.com/better-stack-ai/better-stack/issues/246
	 */
	it.each([
		["prisma", "@prisma/client"],
		["drizzle", "drizzle-orm"],
	] as const)("loads the %s adapter and its peer from the consumer project", async (orm, peerPackage) => {
		const cwd = await createConsumerProject();
		await writePackage(cwd, peerPackage, {
			"package.json": JSON.stringify({
				name: peerPackage,
				type: "module",
				exports: "./index.js",
			}),
			"index.js": `export const peerSource = ${JSON.stringify(peerPackage)};\n`,
		});
		await writePackage(cwd, "better-auth", {
			"package.json": JSON.stringify({
				name: "better-auth",
				type: "module",
				exports: { [`./adapters/${orm}`]: `./${orm}.js` },
			}),
			[`${orm}.js`]: `export { peerSource } from ${JSON.stringify(peerPackage)};\n`,
		});

		const adapter = await importProjectModule<{ peerSource: string }>(
			`better-auth/adapters/${orm}`,
			cwd,
		);

		expect(adapter.peerSource).toBe(peerPackage);
	});
});
