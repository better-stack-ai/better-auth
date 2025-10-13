create table "post" ("id" text not null primary key, "title" text not null, "content" text not null, "published" integer not null, "createdAt" date not null);

create table "author" ("id" text not null primary key, "name" text not null, "email" text not null unique);

create table "comment" ("id" text not null primary key, "content" text not null, "postId" text not null references "post" ("id") on delete cascade);

create table "tag" ("id" text not null primary key, "name" text not null unique);