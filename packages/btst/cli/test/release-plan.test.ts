import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	BTST_CLI_PACKAGE_DIRECTORY,
	createBtstCliReleasePlan,
	formatBtstCliReleasePlan,
} from "../../../../scripts/btst-cli-release-plan";

describe("createBtstCliReleasePlan", () => {
	it("selects only @btst/cli for a CLI release", () => {
		expect(
			createBtstCliReleasePlan("btst-cli-v2.2.4", {
				name: "@btst/cli",
				version: "2.2.4",
			}),
		).toEqual({
			packageDirectory: BTST_CLI_PACKAGE_DIRECTORY,
			packageName: "@btst/cli",
			version: "2.2.4",
			npmTag: "latest",
		});
	});

	it("formats only valid GitHub step outputs", () => {
		expect(
			formatBtstCliReleasePlan(
				createBtstCliReleasePlan("btst-cli-v2.2.4", {
					name: "@btst/cli",
					version: "2.2.4",
				}),
			),
		).toBe(
			[
				"package_directory=packages/btst/cli",
				"package_name=@btst/cli",
				"version=2.2.4",
				"npm_tag=latest",
				"",
			].join("\n"),
		);
	});

	it("writes entrypoint output directly to the GitHub output file", () => {
		const repositoryRoot = fileURLToPath(
			new URL("../../../../", import.meta.url),
		);
		const temporaryDirectory = mkdtempSync(
			join(tmpdir(), "btst-cli-release-plan-"),
		);
		const githubOutput = join(temporaryDirectory, "github-output");

		try {
			const stdout = execFileSync(
				"pnpm",
				[
					"--filter",
					"@btst/cli",
					"exec",
					"tsx",
					"../../../scripts/btst-cli-release-plan.ts",
					"btst-cli-v2.2.4",
				],
				{
					cwd: repositoryRoot,
					encoding: "utf8",
					env: { ...process.env, GITHUB_OUTPUT: githubOutput },
				},
			);

			expect(stdout).not.toContain("package_directory=");
			expect(readFileSync(githubOutput, "utf8")).toBe(
				[
					"package_directory=packages/btst/cli",
					"package_name=@btst/cli",
					"version=2.2.4",
					"npm_tag=latest",
					"",
				].join("\n"),
			);

			const workflow = readFileSync(
				resolve(repositoryRoot, ".github/workflows/better-db-release.yml"),
				"utf8",
			);
			expect(workflow).toContain(
				'run: pnpm --filter @btst/cli exec tsx ../../../scripts/btst-cli-release-plan.ts "$RELEASE_TAG"',
			);
			expect(workflow).not.toContain(
				'run: pnpm --filter @btst/cli exec tsx ../../../scripts/btst-cli-release-plan.ts "$RELEASE_TAG" >> "$GITHUB_OUTPUT"',
			);
		} finally {
			rmSync(temporaryDirectory, { recursive: true, force: true });
		}
	});

	it.each([
		"@btst/db",
		"@btst/adapter-drizzle",
		"@btst/adapter-prisma",
	])("rejects publishing %s through the CLI release path", (packageName) => {
		expect(() =>
			createBtstCliReleasePlan("btst-cli-v2.2.4", {
				name: packageName,
				version: "2.2.4",
			}),
		).toThrow("Release package must be @btst/cli");
	});

	it("rejects the cohort release tag", () => {
		expect(() =>
			createBtstCliReleasePlan("btst-v2.2.4", {
				name: "@btst/cli",
				version: "2.2.4",
			}),
		).toThrow("CLI release tag must start with btst-cli-v");
	});
});
