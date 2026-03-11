import type { Adapter, BetterAuthOptions } from "better-auth";
import { logger } from "better-auth";
import { generateDrizzleSchema } from "./drizzle";
import { generateKyselySchema } from "./kysely";
import { generatePrismaSchema } from "./prisma";

// Re-export all generators and types for use by other packages
export { generateDrizzleSchema } from "./drizzle";
/** @deprecated use generateKyselySchema instead */
export {
	generateKyselySchema,
	generateKyselySchema as generateMigrations,
} from "./kysely";
export { generatePrismaSchema } from "./prisma";
export type { SchemaGenerator } from "./types";

export const adapters = {
	prisma: generatePrismaSchema,
	drizzle: generateDrizzleSchema,
	kysely: generateKyselySchema,
};

export const generateSchema = (opts: {
	adapter: Adapter;
	file?: string;
	options: BetterAuthOptions;
}) => {
	const adapter = opts.adapter;
	const generator =
		adapter.id in adapters
			? adapters[adapter.id as keyof typeof adapters]
			: null;
	if (generator) {
		// generator from the built-in list above
		return generator(opts);
	}
	if (adapter.createSchema) {
		// use the custom adapter's createSchema method
		return adapter
			.createSchema(opts.options, opts.file)
			.then(({ code, path: fileName, overwrite }) => ({
				code,
				fileName,
				overwrite,
			}));
	}

	logger.error(
		`${adapter.id} is not supported. If it is a custom adapter, please request the maintainer to implement createSchema`,
	);
	process.exit(1);
};

/**
 * @deprecated getGenerator is a misnomer as this function gets a generator AND uses it to generate
 * and return the schema. Use generateSchema instead
 */
export const getGenerator = generateSchema;
