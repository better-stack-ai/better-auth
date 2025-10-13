import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/mysql-core";

export const post = mysqlTable("post", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at", { fsp: 3 }).notNull(),
});

export const author = mysqlTable("author", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
});

export const comment = mysqlTable("comment", {
  id: varchar("id", { length: 36 }).primaryKey(),
  content: text("content").notNull(),
  postId: varchar("post_id", { length: 36 })
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
});

export const tag = mysqlTable("tag", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});