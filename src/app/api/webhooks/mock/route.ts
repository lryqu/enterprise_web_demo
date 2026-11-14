import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  reference: z.string().regex(/^ST-[A-Z2-9]{6}$/),
  name: z.string().min(2),
  phone: z.string().min(10),
  zip: z.string().regex(/^\d{5}$/),
  source: z.enum(["chat", "form"]),
}).passthrough();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!payloadSchema.safeParse(body).success) return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
  return NextResponse.json({ ok: true, mode: "simulated" }, { status: 202 });
}