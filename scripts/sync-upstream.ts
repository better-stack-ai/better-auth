#!/usr/bin/env tsx
/**
 * Sync Script: Copy files from better-auth to @btst packages
 *
 * This script syncs specific files from upstream better-auth into @btst packages.
 *
 * IMPORTANT: Adapters are NOT vendored anymore!
 * After v2.0.0, all @btst adapters are thin wrappers that re-export from
 * better-auth/adapters/* instead of vendoring the code. This keeps them simple
 * and automatically in sync with better-auth updates.
 *
 * What this script syncs:
 * - CLI generators (Drizzle, Kysely, Prisma schema generators)
 * - CLI utilities
 *
 * What this script does NOT sync:
 * - Adapter code (drizzle-adapter.ts, kysely-adapter.ts, etc.)
 *   These are now simple re-exports in @btst packages
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

const HEADER_COMMENT_WITH_PATCHES = `/**
 * ⚠️ AUTO-GENERATED WITH PATCHES - DO NOT MODIFY
 * 
 * This file is automatically copied from better-auth with patches applied.
 * Source: {SOURCE_PATH}
 * 
 * Patches applied:
 * - @better-auth/core/utils imports replaced with local ../utils/string
 *   (avoids dependency issues with published @better-auth/core package)
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
	// Kysely Adapter - must be vendored since better-auth doesn't export it
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
		transformImports: (content: string) => {
			// Change imports from @better-auth/core to better-auth/adapters
			return content
				.replace(
					/from ["']@better-auth\/core["']/g,
					'from "better-auth/types"',
				)
				.replace(
					/from ["']@better-auth\/core\/db\/adapter["']/g,
					'from "better-auth/adapters"',
				);
		},
	},

	// CLI Generators
	// These generate schema files for different ORMs
	{
		from: "packages/cli/src/generators",
		to: "packages/btst/cli/src/generators",
		files: ["drizzle.ts", "prisma.ts", "kysely.ts", "types.ts"],
		transformImports: (content: string) => {
			// Replace @better-auth/core/utils import with local string utility
			// This avoids dependency issues since @better-auth/core may not export
			// capitalizeFirstLetter from the /utils subpath in published versions
			return content.replace(
				/import\s*\{\s*capitalizeFirstLetter\s*\}\s*from\s*["']@better-auth\/core\/utils["'];?/g,
				'import { capitalizeFirstLetter } from "../utils/string";',
			);
		},
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

	const originalContent = await fs.readFile(sourcePath, "utf-8");
	let content = originalContent;

	// Apply transform if provided
	const wasTransformed =
		config.transformImports &&
		config.transformImports(content, path.relative(ROOT, sourcePath)) !==
			content;

	if (config.transformImports) {
		content = config.transformImports(content, path.relative(ROOT, sourcePath));
	}

	// Add header comment with source path
	// Use patched header if transforms were applied
	const relativeSourcePath = path.relative(ROOT, sourcePath);
	const headerTemplate = wasTransformed
		? HEADER_COMMENT_WITH_PATCHES
		: HEADER_COMMENT;
	const header = headerTemplate.replace("{SOURCE_PATH}", relativeSourcePath);
	content = header + content;

	// Ensure destination directory exists
	await fs.mkdir(path.dirname(destPath), { recursive: true });

	// Write file
	await fs.writeFile(destPath, content, "utf-8");

	if (wasTransformed) {
		console.log(`    ✨ Patches applied`);
	}
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
	console.log("🔄 Syncing upstream files to @btst packages...\n");
	console.log("📝 Note: Most adapters are simple re-exports, except Kysely (not exported by better-auth)\n");

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
	console.log("📋 Summary:");
	console.log("  • Kysely adapter vendored (imports fixed for better-auth/adapters)");
	console.log("  • CLI generators synced (with @better-auth/core/utils → local utility patch)");
	console.log("  • CLI utils synced");
	console.log("  • Other adapters are thin wrappers (not vendored)");
	console.log("\nNext steps:");
	console.log("  1. Review the generated files");
	console.log("  2. Run `pnpm build --filter \"@btst/*\"` to rebuild packages");
	console.log("  3. Test your changes");
}

syncFiles().catch((error) => {
	console.error("❌ Sync failed:", error.message || error);
	process.exit(1);
});
