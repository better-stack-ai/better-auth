/**
 * Filters out Better Auth's default auth tables from generated schema code
 */

export const DEFAULT_AUTH_TABLES = [
	"user",
	"session",
	"account",
	"verification",
	"rateLimit",
	"ratelimit", // Lowercase variant
];

export const DEFAULT_AUTH_MODELS = [
	"User",
	"Session",
	"Account",
	"Verification",
	"RateLimit",
];

/**
 * Filter Prisma schema to remove auth tables
 */
export function filterPrismaAuthTables(code: string): string {
	const lines = code.split("\n");
	let filteredLines: string[] = [];
	let inAuthModel = false;
	let bracketCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] || "";

		// Check if this is an auth model definition
		const modelMatch = line.match(/^model\s+(\w+)\s*{/);
		if (modelMatch) {
			const modelName = modelMatch[1];
			if (DEFAULT_AUTH_MODELS.includes(modelName || "")) {
				inAuthModel = true;
				bracketCount = 1;
				continue;
			}
		}

		// Track brackets if we're in an auth model
		if (inAuthModel) {
			for (const char of line) {
				if (char === "{") bracketCount++;
				if (char === "}") bracketCount--;
			}

			if (bracketCount === 0) {
				inAuthModel = false;
			}
			continue;
		}

		// Skip relation fields to auth tables
		const relationMatch = line.match(/@relation.*references:\s*\[(\w+)\]/);
		if (relationMatch) {
			const refField = relationMatch[1];
			// Skip if it references an auth table's field
			const prevLine = lines[i - 1];
			if (
				prevLine &&
				DEFAULT_AUTH_MODELS.some((model) =>
					prevLine.includes(model.toLowerCase()),
				)
			) {
				continue;
			}
		}

		filteredLines.push(line);
	}

	// Clean up excessive blank lines (more than 2 consecutive)
	const cleaned = filteredLines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
		.trim();

	return cleaned;
}

/**
 * Filter Drizzle schema to remove auth tables
 */
export function filterDrizzleAuthTables(code: string): string {
	const lines = code.split("\n");
	let filteredLines: string[] = [];
	let inAuthTable = false;
	let parenCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] || "";

		// Check if this is an auth table export
		const tableMatch = line.match(/export\s+const\s+(\w+)\s*=/);
		if (tableMatch) {
			const tableName = tableMatch[1];
			// Check both exact match and lowercase match
			if (
				tableName &&
				(DEFAULT_AUTH_TABLES.includes(tableName.toLowerCase()) ||
					DEFAULT_AUTH_MODELS.some(
						(model) => tableName.toLowerCase() === model.toLowerCase(),
					))
			) {
				inAuthTable = true;
				parenCount = 0;
			}
		}

		if (inAuthTable) {
			// Count parentheses to track the end of the table definition
			for (const char of line) {
				if (char === "(") parenCount++;
				if (char === ")") parenCount--;
			}

			// Check if we've closed all parens (end of table definition)
			if (parenCount === 0 && line.includes(";")) {
				inAuthTable = false;
			}
			continue;
		}

		// Filter out relations that reference auth tables
		// Match patterns like: export const userRelations, export const sessionRelations, etc.
		const relationMatch = line.match(/export\s+const\s+(\w+)Relations\s*=/);
		if (relationMatch) {
			const baseTableName = relationMatch[1];
			if (
				baseTableName &&
				(DEFAULT_AUTH_TABLES.includes(baseTableName.toLowerCase()) ||
					DEFAULT_AUTH_MODELS.some(
						(model) => baseTableName.toLowerCase() === model.toLowerCase(),
					))
			) {
				// Skip this relation and all its lines until we find }));
				let relationDepth = 0;
				let foundEnd = false;
				for (let j = i; j < lines.length && !foundEnd; j++) {
					const relLine = lines[j] || "";
					for (const char of relLine) {
						if (char === "(") relationDepth++;
						if (char === ")") relationDepth--;
					}
					if (relationDepth === 0 && relLine.includes(";")) {
						foundEnd = true;
						i = j; // Skip ahead to the end of this relation
					}
				}
				continue;
			}
		}

		filteredLines.push(line);
	}

	// Clean up excessive blank lines (more than 2 consecutive)
	const cleaned = filteredLines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
		.trim();

	return cleaned;
}

/**
 * Filter Kysely migrations to remove auth tables
 */
export function filterKyselyAuthTables(code: string): string {
	const lines = code.split("\n");
	let filteredLines: string[] = [];
	let inAuthTable = false;

	for (const line of lines) {
		// Check for CREATE TABLE statements for auth tables
		// Match: CREATE TABLE "user", CREATE TABLE user, CREATE TABLE 'user', CREATE TABLE `user`
		const createMatch = line.match(/CREATE\s+TABLE\s+(?:["`']?(\w+)["`']?)/i);
		if (createMatch) {
			const tableName = createMatch[1];
			if (tableName && DEFAULT_AUTH_TABLES.includes(tableName.toLowerCase())) {
				inAuthTable = true;
				continue; // Skip this line
			} else if (tableName) {
				// This is a non-auth table, keep it
				inAuthTable = false;
			}
		}

		// Skip lines until we hit a semicolon (end of CREATE TABLE)
		if (inAuthTable) {
			if (line.includes(";")) {
				inAuthTable = false; // End of statement
			}
			continue; // Skip all lines in auth table
		}

		// Skip CREATE INDEX statements for auth tables
		// Match patterns like: CREATE INDEX "session_userId_idx" ON "session"
		const indexMatch = line.match(
			/CREATE\s+INDEX\s+["`']?\w*["`']?\s+ON\s+["`']?(\w+)["`']?/i,
		);
		if (indexMatch) {
			const tableName = indexMatch[1];
			if (tableName && DEFAULT_AUTH_TABLES.includes(tableName.toLowerCase())) {
				continue; // Skip this index
			}
		}

		// Skip ALTER TABLE statements for auth tables
		const alterMatch = line.match(/ALTER\s+TABLE\s+["`']?(\w+)["`']?/i);
		if (alterMatch) {
			const tableName = alterMatch[1];
			if (tableName && DEFAULT_AUTH_TABLES.includes(tableName.toLowerCase())) {
				continue; // Skip this line
			}
		}

		// Skip foreign key references to auth tables
		const refMatch = line.match(/REFERENCES\s+["`']?(\w+)["`']?/i);
		if (refMatch) {
			const refTable = refMatch[1];
			if (refTable && DEFAULT_AUTH_TABLES.includes(refTable.toLowerCase())) {
				continue; // Skip this line
			}
		}

		// Keep this line
		filteredLines.push(line);
	}

	return filteredLines.join("\n").trim();
}

/**
 * Generic filter that detects ORM and applies appropriate filter
 */
export function filterAuthTables(
	code: string,
	orm: "prisma" | "drizzle" | "kysely",
): string {
	switch (orm) {
		case "prisma":
			return filterPrismaAuthTables(code);
		case "drizzle":
			return filterDrizzleAuthTables(code);
		case "kysely":
			return filterKyselyAuthTables(code);
		default:
			return code;
	}
}
