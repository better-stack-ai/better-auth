#!/usr/bin/env tsx
/**
 * Sync Script: Copy files from better-auth to @btst packages
 *
 * This script vendors code from the upstream better-auth package into our
 * @btst packages so we can publish them independently.
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
		transformImports: (content) => {
			// Update imports from better-auth internal paths to external package imports
			return content
				.replace(/from ["']\.\.\/\.\.\/types["']/g, 'from "better-auth/types"')
				.replace(
					/from ["']\.\.\/adapter-factory["']/g,
					'from "better-auth/adapters"',
				)
				.replace(/from ["']\.\.\/\.\.\/db["']/g, 'from "better-auth/db"');
		},
	},

	// Drizzle Adapter
	{
		from: "packages/better-auth/src/adapters/drizzle-adapter",
		to: "packages/btst/adapter-drizzle/src",
		files: ["drizzle-adapter.ts"],
		transformImports: (content) => {
			return content
				.replace(/from ["']\.\.\/\.\.\/types["']/g, 'from "better-auth/types"')
				.replace(
					/from ["']\.\.\/adapter-factory["']/g,
					'from "better-auth/adapters"',
				)
				.replace(/from ["']\.\.\/\.\.\/db["']/g, 'from "better-auth/db"')
				.replace(/from ["']\.\.\/\.\.\/error["']/g, 'from "better-auth"');
		},
	},

	// CLI Generators
	{
		from: "packages/cli/src/generators",
		to: "packages/btst/cli/src/generators",
		files: ["drizzle.ts", "prisma.ts", "kysely.ts", "types.ts"],
		transformImports: (content) => {
			// These should already use better-auth package imports, so minimal changes
			return content;
		},
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

async function syncFiles() {
	console.log("🔄 Syncing upstream files...\n");

	for (const config of COPY_CONFIGS) {
		const destName = path.basename(config.to);
		console.log(`📦 ${config.from} → ${destName}/`);

		if (config.files) {
			for (const file of config.files) {
				await copyFile(config, file);
			}
		}

		console.log("");
	}

	console.log("✅ Sync complete!\n");
	console.log("Next steps:");
	console.log("  1. Review the generated files");
	console.log("  2. Run `pnpm build` to rebuild packages");
	console.log("  3. Test your changes");
}

syncFiles().catch((error) => {
	console.error("❌ Sync failed:", error);
	process.exit(1);
});
