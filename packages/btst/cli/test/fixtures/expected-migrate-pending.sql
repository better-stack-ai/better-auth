create table "warehouse" ("id" text not null primary key, "location" text not null, "capacity" integer not null);

create table "inventory" ("id" text not null primary key, "itemId" text not null, "quantity" integer not null);

