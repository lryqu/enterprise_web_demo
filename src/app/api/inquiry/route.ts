import { NextResponse } from "next/server";
import { z } from "zod";
import { createLeadAndDeliver } from "@/lib/leads";

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{10,25}$/),
  zip: z.string().trim().regex(/^\d{5}$/),
  email: z.string().trim().email().max(200).or(z.literal("")),
  projectType: z.enum(["Whole-home renovation", "Kitchen", "Bathroom", "Addition", "Other"]),
  message: z.string().trim().max(3000),
}).strict();

async function readLimitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new RangeError("body-too-large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 12_000) return NextResponse.json({ error: "Inquiry is too large." }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(await readLimitedBody(request, 12_000));
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Inquiry is too large." }, { status: 413 });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please review the required inquiry details." }, { status: 400 });
  const data = parsed.data;
  const lead = await createLeadAndDeliver({ ...data, email: data.email || null, source: "form" });
  return NextResponse.json({ reference: lead.reference, saved: lead.saved }, { status: 201 });
}