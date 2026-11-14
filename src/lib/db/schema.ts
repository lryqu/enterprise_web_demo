import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  zip: text("zip").notNull(),
  email: text("email"),
  projectType: text("project_type"),
  message: text("message"),
  source: text("source").notNull(),
  conversationId: text("conversation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("leads_conversation_phone_unique").on(table.conversationId, table.phone),
  index("leads_created_at_idx").on(table.createdAt),
]);

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  mode: text("mode").notNull(),
  target: text("target").notNull(),
  delivered: boolean("delivered").notNull(),
  responseStatus: integer("response_status"),
  error: text("error"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("webhook_events_lead_id_idx").on(table.leadId)]);