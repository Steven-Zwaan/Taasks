CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" text,
	"scope" text DEFAULT 'day' NOT NULL,
	"due_date" text,
	"color" text DEFAULT 'blue' NOT NULL,
	"rollover_rule" text DEFAULT 'next-day' NOT NULL,
	"rollover_from_id" text,
	"user_id" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
