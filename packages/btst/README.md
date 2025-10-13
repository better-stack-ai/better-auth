# Better DB

**Database utilities without the auth domain—a focused fork of Better Auth's database layer.**

Better DB gives you Better Auth's proven adapter pattern and CLI-driven schema generation, focused purely on database management.

## Features

- 🎯 **Focused** — Database utilities without auth complexity
- 🔄 **Upstream Syncable** — Stays aligned with Better Auth updates
- 🔧 **Battle-tested** — Built on Better Auth's proven architecture
- 🚀 **Multi-ORM** — Prisma, Drizzle, Kysely, MongoDB, and more
- 🔌 **Extensible** — Plugin system for custom tables
- ⚡ **CLI-driven** — Generate schemas with a single command

## Quick Start

```bash
# Install core and your preferred adapter
npm install @btst/db @btst/adapter-prisma
npm install -D @btst/cli
```

Define your schema:

```typescript
// db.ts
import { defineDb } from "@btst/db";

export const db = defineDb({
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
      },
      createdAt: {
        type: "date",
        defaultValue: () => new Date(),
      },
    },
  },
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
    },
  },
});

export default db;
```

Generate and run migrations:

```bash
# Generate Prisma schema
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma

# Or for Kysely (requires database connection)
DATABASE_URL=sqlite:./dev.db npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql
# Or: npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=sqlite:./dev.db

# Run migrations
npx prisma migrate dev
```

Use in your app:

```typescript
import { prismaAdapter } from "@btst/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const adapter = prismaAdapter(prisma)({});

// Create
await adapter.create({
  model: "post",
  data: { title: "Hello", content: "World", authorId: "1" },
});

// Query
const posts = await adapter.findMany({
  model: "post",
  where: [{ field: "published", value: true }],
});
```

## CLI Commands

### Initialize

```bash
npx better-db init [--output=db.ts]
```

### Generate

```bash
# Prisma
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma

# Drizzle
npx better-db generate --config=db.ts --orm=drizzle --output=src/db/schema.ts

# Kysely (requires database connection for introspection)
# Using DATABASE_URL environment variable
DATABASE_URL=sqlite:./dev.db npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql

# Or using --database-url flag
npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=sqlite:./dev.db
npx better-db generate --config=db.ts --orm=kysely --output=migrations/schema.sql --database-url=postgres://user:pass@localhost:5432/db

# Filter auth tables (User, Session, Account, Verification)
npx better-db generate --config=db.ts --orm=prisma --output=schema.prisma --filter-auth
```

### Migrate

```bash
# Kysely only - for Prisma/Drizzle use their native tools
# Using DATABASE_URL environment variable or --database-url param
DATABASE_URL=sqlite:./dev.db npx better-db migrate --config=db.ts

# Or using --database-url flag
npx better-db migrate --config=db.ts --database-url=sqlite:./dev.db
npx better-db migrate --config=db.ts --database-url=postgres://user:pass@localhost:5432/db

# Generate SQL to file instead of running migrations
npx better-db migrate --config=db.ts --output=migrations.sql --database-url=sqlite:./dev.db

# Filter auth tables (User, Session, Account, Verification)
npx better-db migrate --config=db.ts --output=migrations.sql --filter-auth --database-url=sqlite:./dev.db
```

## Field Types

```typescript
defineDb({
  example: {
    modelName: "example",
    fields: {
      // Basic types
      textField: { type: "string" },
      numberField: { type: "number" },
      booleanField: { type: "boolean" },
      dateField: { type: "date" },
      jsonField: { type: "json" },
      
      // Required/Optional
      required: { type: "string", required: true },
      optional: { type: "string", required: false },
      
      // Unique
      uniqueField: { type: "string", unique: true },
      
      // Defaults
      active: { type: "boolean", defaultValue: false },
      createdAt: { type: "date", defaultValue: () => new Date() },
      
      // References
      userId: {
        type: "string",
        references: {
          model: "user",
          field: "id",
          onDelete: "cascade",
        },
      },
    },
  },
})
```

## Adapter API

All adapters provide these methods:

```typescript
// Create
adapter.create({ model: "post", data: {...} })

// Read
adapter.findOne({ model: "post", where: [...] })
adapter.findMany({ model: "post", where: [...], limit: 10 })
adapter.count({ model: "post", where: [...] })

// Update
adapter.update({ model: "post", where: [...], update: {...} })
adapter.updateMany({ model: "post", where: [...], update: {...} })

// Delete
adapter.delete({ model: "post", where: [...] })
adapter.deleteMany({ model: "post", where: [...] })
```

See [Better Auth Adapter Guide](https://www.better-auth.com/docs/guides/create-a-db-adapter) for details.

## Plugins

Extend your schema with reusable plugins:

```typescript
import { defineDb } from "@btst/db";
import { todoPlugin } from "@btst/plugins";

export const db = defineDb({
  post: {
    modelName: "post",
    fields: {
      title: { type: "string", required: true },
    },
  },
}).use(todoPlugin);
```

Create custom plugins:

```typescript
import { createDbPlugin } from "@btst/db";

export const tagsPlugin = createDbPlugin("tags", {
  tag: {
    modelName: "tag",
    fields: {
      name: {
        type: "string",
        required: true,
        unique: true,
      },
    },
  },
});
```

## Available Adapters

```bash
npm install @btst/adapter-prisma    # Prisma
npm install @btst/adapter-drizzle   # Drizzle
npm install @btst/adapter-kysely    # Kysely
npm install @btst/adapter-memory    # Memory (testing)
npm install @btst/adapter-mongodb   # MongoDB
```

## Relationship with Better Auth

Better DB is a thin wrapper around Better Auth's database layer:

**What we keep:**
- ✅ All adapter implementations
- ✅ CLI generation behavior
- ✅ Field type system
- ✅ Plugin architecture

**What we exclude:**
- ❌ Auth tables (user, session, account)
- ❌ OAuth configurations
- ❌ Authentication middleware

**Versioning:** `@btst/*@1.4.x` tracks `better-auth@1.4.x`

## Migration from Better Auth

Replace imports:

```typescript
// Before
import { prismaAdapter } from "better-auth/adapters/prisma";

// After
import { prismaAdapter } from "@btst/adapter-prisma";
```

Replace config with schema:

```typescript
// Before
export const auth = betterAuth({
  database: prismaClient,
  plugins: [...]
});

// After
export const db = defineDb({
  // your tables using Better Auth schema format
  post: {
    modelName: "post",
    fields: {
      title: { type: "string", required: true },
    },
  },
});
```

Update CLI:

```bash
# Before
npx @better-auth/cli generate

# After
npx better-db generate
```

## Examples

### Blog Platform

```typescript
import { defineDb } from "@btst/db";

export const db = defineDb({
  post: {
    modelName: "post",
    fields: {
      title: {
        type: "string",
        required: true,
      },
      slug: {
        type: "string",
        required: true,
        unique: true,
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
    },
  },
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
    },
  },
  category: {
    modelName: "category",
    fields: {
      name: {
        type: "string",
        required: true,
      },
      slug: {
        type: "string",
        required: true,
        unique: true,
      },
    },
  },
});
```

### E-commerce

```typescript
export const db = defineDb({
  product: {
    modelName: "product",
    fields: {
      name: {
        type: "string",
        required: true,
      },
      slug: {
        type: "string",
        required: true,
        unique: true,
      },
      price: {
        type: "number",
        required: true,
      },
      inventory: {
        type: "number",
        defaultValue: 0,
      },
      categoryId: {
        type: "string",
        required: false,
        references: {
          model: "category",
          field: "id",
          onDelete: "set null",
        },
      },
    },
  },
  order: {
    modelName: "order",
    fields: {
      orderNumber: {
        type: "string",
        required: true,
        unique: true,
      },
      customerId: {
        type: "string",
        required: true,
        references: {
          model: "customer",
          field: "id",
          onDelete: "cascade",
        },
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "pending",
      },
      total: {
        type: "number",
        required: true,
      },
      createdAt: {
        type: "date",
        defaultValue: () => new Date(),
      },
    },
  },
  orderItem: {
    modelName: "order_item",
    fields: {
      orderId: {
        type: "string",
        required: true,
        references: {
          model: "order",
          field: "id",
          onDelete: "cascade",
        },
      },
      productId: {
        type: "string",
        required: true,
        references: {
          model: "product",
          field: "id",
          onDelete: "cascade",
        },
      },
      quantity: {
        type: "number",
        required: true,
      },
      price: {
        type: "number",
        required: true,
      },
    },
  },
});
```

## Resources

- [Better Auth Docs](https://better-auth.com/docs/concepts/database)
- [GitHub Issues](https://github.com/better-auth/better-auth/issues)
- [Discussions](https://github.com/better-auth/better-auth/discussions)

## License

MIT
