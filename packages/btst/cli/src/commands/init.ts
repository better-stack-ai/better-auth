import { Command } from "commander";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

interface InitOptions {
	cwd: string;
	output?: string;
}

async function initAction(options: InitOptions) {
	try {
		console.log(chalk.blue("🚀 Better DB Init"));
		console.log(chalk.gray("Creating a new better-db schema..."));

		const outputPath = options.output || path.join(options.cwd, "db.ts");

		// Check if file already exists
		const exists = await fileExists(outputPath);
		if (exists) {
			console.log(chalk.yellow(`⚠️  Schema file already exists: ${outputPath}`));
			console.log(
				chalk.gray("Use the --output option to specify a different path."),
			);
			return;
		}

		// Create the example schema
		const schemaContent = createExampleSchema();

		await fs.writeFile(outputPath, schemaContent, "utf8");

		console.log(chalk.green(`✅ Created schema file: ${outputPath}`));
		console.log();
		console.log(chalk.blue("Next steps:"));
		console.log(chalk.gray("1. Edit the schema file to define your tables"));
		console.log(
			chalk.gray(
				"2. Run `better-db generate --orm=<prisma|drizzle|kysely>` to generate database files",
			),
		);
		console.log();
		console.log(chalk.yellow("Example usage:"));
		console.log(
			chalk.gray(
				"  better-db generate --orm=prisma --output=prisma/schema.prisma",
			),
		);
	} catch (error: any) {
		console.error(chalk.red("❌ Initialization failed:"), error.message);
		process.exit(1);
	}
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function createExampleSchema(): string {
	return `import { defineDb } from "@btst/db";

// Define your database schema using Better Auth schema syntax
export const db = defineDb({
  // Example: Blog post table
  post: {
    modelName: "post",
    fields: {
      title: {
        type: "string",
        required: true,
      },
      content: {
        type: "string",
        required: true,
      },
      published: {
        type: "boolean",
        defaultValue: false,
      },
      authorId: {
        type: "string",
        required: true,
        references: {
          model: "author",
          field: "id",
          onDelete: "cascade",
        },
      },
      createdAt: {
        type: "date",
        defaultValue: () => new Date(),
      },
      updatedAt: {
        type: "date",
        defaultValue: () => new Date(),
      },
    },
  },

  // Example: Author table
  author: {
    modelName: "author",
    fields: {
      name: {
        type: "string",
        required: true,
      },
      email: {
        type: "string",
        required: true,
        unique: true,
      },
      bio: {
        type: "string",
        required: false,
      },
      createdAt: {
        type: "date",
        defaultValue: () => new Date(),
      },
    },
  },

  // Example: Category table
  category: {
    modelName: "category",
    fields: {
      name: {
        type: "string",
        required: true,
        unique: true,
      },
      slug: {
        type: "string",
        required: true,
        unique: true,
      },
    },
  },

  // Junction table for posts-categories relationship
  postCategory: {
    modelName: "post_category",
    fields: {
      postId: {
        type: "string",
        required: true,
        references: {
          model: "post",
          field: "id",
          onDelete: "cascade",
        },
      },
      categoryId: {
        type: "string",
        required: true,
        references: {
          model: "category",
          field: "id",
          onDelete: "cascade",
        },
      },
    },
  },
});

export default db;
`;
}

export const initCommand = new Command("init")
	.description("Initialize a new better-db schema file")
	.option("--cwd <dir>", "Current working directory", process.cwd())
	.option("--output <path>", "Output path for schema file", "db.ts")
	.action(initAction);
