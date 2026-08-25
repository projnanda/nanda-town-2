import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  serial,
  integer,
  index,
} from "drizzle-orm/pg-core";

// Listings. Source of truth is the records/ directory in the git repo;
// this table is a derived index plus live state. Never written by the web UI.
export const records = pgTable(
  "records",
  {
    slug: text("slug").primaryKey(),
    kind: text("kind").notNull(), // "agent" | "service"
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    ownerGithub: text("owner_github").notNull(),
    entry: jsonb("entry").notNull().$type<Record<string, unknown>>(),
    consentProbes: boolean("consent_probes").notNull().default(false),
    tags: jsonb("tags").notNull().default([]).$type<string[]>(),
    status: text("status").notNull().default("listed"), // listed | delisted
    fingerprint: text("fingerprint").notNull(),
    sourceCommit: text("source_commit"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("records_kind_idx").on(t.kind), index("records_status_idx").on(t.status)],
);

// Evidence: one observer, one subject, one time. A subject never writes its own record.
export const evidence = pgTable(
  "evidence",
  {
    id: serial("id").primaryKey(),
    recordSlug: text("record_slug").notNull(),
    type: text("type").notNull(), // "liveness" | "structural"
    observer: text("observer").notNull(), // e.g. "town-pulse@nanda-town-2.up.railway.app"
    subjectFingerprint: text("subject_fingerprint").notNull(),
    outcome: jsonb("outcome").notNull().$type<Record<string, unknown>>(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("evidence_record_idx").on(t.recordSlug, t.observedAt),
    index("evidence_type_idx").on(t.type),
  ],
);

// Pulse heartbeats — the dead-man switch. If the latest heartbeat is stale,
// every liveness surface on the site must say "pulse paused since T".
export const heartbeats = pgTable("heartbeats", {
  id: serial("id").primaryKey(),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  probed: integer("probed").notNull().default(0),
  notes: text("notes"),
});

// On-demand inspections (the single-player tool). Ephemeral, shareable.
export const inspections = pgTable(
  "inspections",
  {
    id: text("id").primaryKey(),
    targetUrl: text("target_url").notNull(),
    report: jsonb("report").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inspections_created_idx").on(t.createdAt)],
);
