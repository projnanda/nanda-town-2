CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_slug" text NOT NULL,
	"type" text NOT NULL,
	"observer" text NOT NULL,
	"subject_fingerprint" text NOT NULL,
	"outcome" jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeats" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"probed" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"target_url" text NOT NULL,
	"report" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"slug" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"owner_github" text NOT NULL,
	"entry" jsonb NOT NULL,
	"consent_probes" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'listed' NOT NULL,
	"fingerprint" text NOT NULL,
	"source_commit" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evidence_record_idx" ON "evidence" USING btree ("record_slug","observed_at");--> statement-breakpoint
CREATE INDEX "evidence_type_idx" ON "evidence" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inspections_created_idx" ON "inspections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "records_kind_idx" ON "records" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "records_status_idx" ON "records" USING btree ("status");