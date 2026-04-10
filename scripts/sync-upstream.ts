#!/usr/bin/env tsx

/**
 * Sync Script: Copy files from better-auth to @btst packages
 *
 * This script syncs specific files from upstream better-auth into @btst packages.
 *
 * All @btst adapters are vendored copies of the standalone adapter packages.
 * This ensures @btst packages always use the full-featured standalone adapters
 * (with fixes like IS NULL / IS NOT NULL) rather than the built-in better-auth adapters.
 *
 * What this script syncs:
 * - Drizzle adapter (packages/drizzle-adapter/src/ → packages/btst/adapter-drizzle/src/)
 * - Prisma adapter (packages/prisma-adapter/src/ → packages/btst/adapter-prisma/src/)
 * - Memory adapter (packages/memory-adapter/src/ → packages/btst/adapter-memory/src/)
 * - MongoDB adapter (packages/mongo-adapter/src/ → packages/btst/adapter-mongodb/src/)
 * - Kysely adapter (packages/kysely-adapter/src/ → packages/btst/adapter-kysely/src/)
 *   Kysely also needs import patches to replace @better-auth/core/utils with a local utility.
 * - CLI generators (Drizzle, Kysely, Prisma schema generators)
 * - CLI utilities
 *
 * Run: pnpm tsx scripts/sync-upstream.ts
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
	// Drizzle Adapter - vendored from the standalone @better-auth/drizzle-adapter package.
	// Using the standalone package ensures btst gets all fixes (e.g. IS NULL / IS NOT NULL)
	// that may not be present in the built-in better-auth/adapters/drizzle.
	{
		from: "packages/drizzle-adapter/src",
		to: "packages/btst/adapter-drizzle/src",
		files: ["drizzle-adapter.ts", "query-builders.ts"],
	},

	// Prisma Adapter - vendored from the standalone @better-auth/prisma-adapter package.
	{
		from: "packages/prisma-adapter/src",
		to: "packages/btst/adapter-prisma/src",
		files: ["prisma-adapter.ts"],
	},

	// Memory Adapter - vendored from the standalone @better-auth/memory-adapter package.
	{
		from: "packages/memory-adapter/src",
		to: "packages/btst/adapter-memory/src",
		files: ["memory-adapter.ts", "query-builders.ts"],
	},

	// MongoDB Adapter - vendored from the standalone @better-auth/mongo-adapter package.
	{
		from: "packages/mongo-adapter/src",
		to: "packages/btst/adapter-mongodb/src",
		files: ["mongodb-adapter.ts", "query-builders.ts"],
	},

	// Kysely Adapter - vendored from the standalone @better-auth/kysely-adapter package.
	// Also needs import patches to replace @better-auth/core/utils with a local utility.
	{
		from: "packages/kysely-adapter/src",
		to: "packages/btst/adapter-kysely/src",
		files: [
			"kysely-adapter.ts",
			"query-builders.ts",
			"types.ts",
			"dialect.ts",
			"bun-sqlite-dialect.ts",
			"d1-sqlite-dialect.ts",
			"node-sqlite-dialect.ts",
		],
		transformImports: (content: string) => {
			// Map @better-auth/core subpath imports to their published equivalents.
			// Note: @better-auth/core/utils/string (v1.5.4+) replaces the old /utils path.
			return content
				.replace(/from ["']@better-auth\/core["']/g, 'from "better-auth/types"')
				.replace(
					/from ["']@better-auth\/core\/db\/adapter["']/g,
					'from "better-auth/adapters"',
				)
				.replace(
					/import\s*\{\s*capitalizeFirstLetter\s*\}\s*from\s*["']@better-auth\/core\/utils(?:\/string)?["'];?/g,
					'import { capitalizeFirstLetter } from "./utils/string";',
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
			// Replace @better-auth/core/utils import with local string utility.
			// Matches both the old /utils path (pre-v1.5.4) and the new /utils/string path.
			return content.replace(
				/import\s*\{\s*capitalizeFirstLetter\s*\}\s*from\s*["']@better-auth\/core\/utils(?:\/string)?["'];?/g,
				'import { capitalizeFirstLetter } from "../utils/string";',
			);
		},
	},

	// CLI Utils (required by generators)
	{
		from: "packages/cli/src/utils",
		to: "packages/btst/cli/src/utils",
		files: ["get-package-info.ts", "helper.ts"],
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
	console.log(
		"📝 Note: Most adapters are simple re-exports, except Kysely (not exported by better-auth)\n",
	);

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
	console.log("  • Drizzle adapter vendored from @better-auth/drizzle-adapter");
	console.log("  • Prisma adapter vendored from @better-auth/prisma-adapter");
	console.log("  • Memory adapter vendored from @better-auth/memory-adapter");
	console.log("  • MongoDB adapter vendored from @better-auth/mongo-adapter");
	console.log(
		"  • Kysely adapter vendored (with @better-auth/core/utils → local utility patch)",
	);
	console.log(
		"  • CLI generators synced (with @better-auth/core/utils → local utility patch)",
	);
	console.log("  • CLI utils synced");
	console.log("\nNext steps:");
	console.log("  1. Review the generated files");
	console.log('  2. Run `pnpm build --filter "@btst/*"` to rebuild packages');
	console.log("  3. Test your changes");
}

syncFiles().catch((error) => {
	console.error("❌ Sync failed:", error.message || error);
	process.exit(1);
});
