import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads, webhookEvents } from "@/lib/db/schema";

export type LeadInput = {
  name: string;
  phone: string;
  zip: string;
  email?: string | null;
  projectType?: string | null;
  message?: string | null;
  source: "chat" | "form";
  conversationId?: string | null;
};

export type LeadResult = { reference: string; duplicate: boolean; saved: boolean };

function makeReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `ST-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function createLeadAndDeliver(input: LeadInput): Promise<LeadResult> {
  const reference = makeReference();
  let db: ReturnType<typeof getDb> = null;
  try {
    db = getDb();
  } catch {
    db = null;
  }
  let leadId: number | null = null;
  let insertedReference = reference;
  let duplicate = false;

  if (db) {
    try {
      const inserted = await db.insert(leads).values({
        reference,
        name: input.name,
        phone: input.phone,
        zip: input.zip,
        email: input.email ?? null,
        projectType: input.projectType ?? null,
        message: input.message ?? null,
        source: input.source,
        conversationId: input.conversationId ?? null,
      }).onConflictDoNothing({ target: [leads.conversationId, leads.phone] }).returning({ id: leads.id, reference: leads.reference });
      if (inserted.length) {
        leadId = inserted[0].id;
        insertedReference = inserted[0].reference;
      } else {
        duplicate = true;
      }
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code === "23505") duplicate = true;
    }
  }

  if (duplicate) return { reference: "", duplicate: true, saved: true };

  const payload = {
    reference: insertedReference,
    name: input.name,
    phone: input.phone,
    zip: input.zip,
    email: input.email ?? null,
    projectType: input.projectType ?? null,
    message: input.message ?? null,
    source: input.source,
    conversationId: input.conversationId ?? null,
  };
  const configuredUrl = process.env.MAKE_WEBHOOK_URL;
  const target = configuredUrl || `${(process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/webhooks/mock`;
  const mode = configuredUrl ? "live" : "simulated";
  const attempts = configuredUrl ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let responseStatus: number | null = null;
    let delivered = false;
    let errorMessage: string | null = null;
    try {
      const response = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      responseStatus = response.status;
      delivered = response.ok;
      if (!response.ok) errorMessage = `Webhook returned HTTP ${response.status}`;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 300) : "Webhook request failed";
    }

    if (db && leadId !== null) {
      try {
        await db.insert(webhookEvents).values({
          leadId,
          event: "lead.created",
          mode,
          target,
          delivered,
          responseStatus,
          error: errorMessage,
          payload,
        });
      } catch {}
    }

    if (delivered || responseStatus === null || responseStatus < 500) break;
  }

  return { reference: insertedReference, duplicate: false, saved: leadId !== null };
}

export async function findLeadByReference(reference: string) {
  const db = getDb();
  if (!db) return null;
  const [lead] = await db.select().from(leads).where(eq(leads.reference, reference)).limit(1);
  return lead ?? null;
}