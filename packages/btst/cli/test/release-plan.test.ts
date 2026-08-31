import { describe, expect, it } from "vitest";
import {
	BTST_CLI_PACKAGE_DIRECTORY,
	createBtstCliReleasePlan,
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
