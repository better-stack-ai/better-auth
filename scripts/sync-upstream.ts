#!/usr/bin/env tsx
/**
 * Sync Script: Copy files from better-auth to @btst packages
 *
 * This script vendors code from the upstream better-auth package into our
 * @btst packages so we can publish them independently.
 *
 * After the major refactor where code was moved to @better-auth/core,
 * the adapters now use proper package imports (e.g., @better-auth/core)
 * instead of relative imports, so we can copy them directly without
 * transforming imports.
 *
 * Run: pnpm tsx scripts/sync-upstream.ts
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HEADER_COMMENT = `/**
 * ⚠️ AUTO-GENERATED - DO NOT MODIFY
 * 
 * This file is automatically copied from better-auth.
 * Source: {SOURCE_PATH}
 * 
 * To update: run \`pnpm sync-upstream\`
 * Any manual changes will be overwritten.
 */

`;

interface CopyConfig {
	from: string;
	to: string;
	files?: string[];
	recursive?: boolean;
	transformImports?: (content: string, sourcePath: string) => string;
}

const ROOT = path.resolve(__dirname, "..");

const COPY_CONFIGS: CopyConfig[] = [
	// Kysely Adapter
	// Note: After the refactor to @better-auth/core, these files now import
	// from @better-auth/core packages, so no import transformation needed
	{
		from: "packages/better-auth/src/adapters/kysely-adapter",
		to: "packages/btst/adapter-kysely/src",
		files: [
			"kysely-adapter.ts",
			"types.ts",
			"dialect.ts",
			"bun-sqlite-dialect.ts",
			"node-sqlite-dialect.ts",
		],
		// No transform needed - files already use @better-auth/core imports
	},

	// Drizzle Adapter
	// Note: After the refactor to @better-auth/core, these files now import
	// from @better-auth/core packages, so no import transformation needed
	{
		from: "packages/better-auth/src/adapters/drizzle-adapter",
		to: "packages/btst/adapter-drizzle/src",
		files: ["drizzle-adapter.ts"],
		// No transform needed - files already use @better-auth/core imports
	},

	// CLI Generators
	{
		from: "packages/cli/src/generators",
		to: "packages/btst/cli/src/generators",
		files: ["drizzle.ts", "prisma.ts", "kysely.ts", "types.ts"],
		// No transform needed - @better-auth/core is a peer dependency
	},

	// CLI Utils (required by generators)
	{
		from: "packages/cli/src/utils",
		to: "packages/btst/cli/src/utils",
		files: ["get-package-info.ts"],
		// No transform needed - files already use proper package imports
	},
];

async function copyFile(config: CopyConfig, file: string) {
	const sourcePath = path.join(ROOT, config.from, file);
	const destPath = path.join(ROOT, config.to, file);

	console.log(`  ${file}`);

	if (!existsSync(sourcePath)) {
		console.warn(`    ⚠️  Source file not found: ${sourcePath}`);
		return;
	}

	let content = await fs.readFile(sourcePath, "utf-8");

	// Apply transform if provided
	if (config.transformImports) {
		content = config.transformImports(content, path.relative(ROOT, sourcePath));
	}

	// Add header comment with source path
	const relativeSourcePath = path.relative(ROOT, sourcePath);
	const header = HEADER_COMMENT.replace("{SOURCE_PATH}", relativeSourcePath);
	content = header + content;

	// Ensure destination directory exists
	await fs.mkdir(path.dirname(destPath), { recursive: true });

	// Write file
	await fs.writeFile(destPath, content, "utf-8");
}

async function validateSources() {
	console.log("🔍 Validating source files...\n");
	let allValid = true;

	for (const config of COPY_CONFIGS) {
		const sourceDir = path.join(ROOT, config.from);
		if (!existsSync(sourceDir)) {
			console.error(`❌ Source directory not found: ${config.from}`);
			allValid = false;
			continue;
		}

		if (config.files) {
			for (const file of config.files) {
				const sourcePath = path.join(ROOT, config.from, file);
				if (!existsSync(sourcePath)) {
					console.error(`❌ Source file not found: ${config.from}/${file}`);
					allValid = false;
				}
			}
		}
	}

	if (!allValid) {
		throw new Error(
			"Some source files are missing. The upstream structure may have changed.",
		);
	}

	console.log("✅ All source files found\n");
}

async function syncFiles() {
	console.log("🔄 Syncing upstream files...\n");

	await validateSources();

	let totalFilesCopied = 0;

	for (const config of COPY_CONFIGS) {
		const destName = path.basename(config.to);
		console.log(`📦 ${config.from} → ${destName}/`);

		if (config.files) {
			for (const file of config.files) {
				await copyFile(config, file);
				totalFilesCopied++;
			}
		}

		console.log("");
	}

	console.log(`✅ Sync complete! Copied ${totalFilesCopied} files.\n`);
	console.log("Next steps:");
	console.log("  1. Review the generated files");
	console.log("  2. Run `pnpm build` to rebuild packages");
	console.log("  3. Test your changes");
}

syncFiles().catch((error) => {
	console.error("❌ Sync failed:", error.message || error);
	process.exit(1);
});
