CREATE TABLE "record_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_slug" text NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "record_history_slug_idx" ON "record_history" USING btree ("record_slug","seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "record_history_slug_fp_idx" ON "record_history" USING btree ("record_slug","fingerprint");