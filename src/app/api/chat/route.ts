import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askProvider, getProvider, parseLeadToken, scriptedReply, validateGroundedToken, type ChatTurn } from "@/lib/chat";
import { createLeadAndDeliver } from "@/lib/leads";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(20),
  conversationId: z.string().uuid().optional(),
}).strict();

const windows = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (windows.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 10) {
    windows.set(ip, recent);
    return true;
  }
  recent.push(now);
  windows.set(ip, recent);
  return false;
}

async function readLimitedBody(request: NextRequest, limit: number) {
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

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_000) return NextResponse.json({ error: "Message is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Please pause for a moment before sending another message." }, { status: 429 });

  let raw: unknown;
  try {
    const text = await readLimitedBody(request, 16_000);
    raw = JSON.parse(text);
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Message is too large." }, { status: 413 });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please send a message with a valid conversation history." }, { status: 400 });

  const body = parsed.data;
  const messages: ChatTurn[] = [...body.history, { role: "user", content: body.message }];
  const provider = getProvider();
  const generated = provider ? await askProvider(provider, messages) : null;
  const mode = generated ? "live" : "scripted";
  const modelReply = generated ?? scriptedReply(body.message, messages);
  const { cleanReply, token } = parseLeadToken(modelReply);
  if (!token) return NextResponse.json({ reply: cleanReply || "I can help you think through the project. What would be most useful to start with?", mode, leadCaptured: null });

  const grounded = validateGroundedToken(token, messages);
  if (!grounded.valid || !grounded.missing) {
    const question = grounded.missing === "name" ? "What is your full name?" : grounded.missing === "phone" ? "What 10-digit phone number is best to reach you?" : "What is the 5-digit ZIP code for the project?";
    return NextResponse.json({ reply: `${cleanReply ? `${cleanReply} ` : ""}${question}`, mode, leadCaptured: null });
  }

  const lead = await createLeadAndDeliver({ name: token.name, phone: grounded.phone, zip: grounded.zip, source: "chat", conversationId: body.conversationId ?? null });
  if (lead.duplicate) return NextResponse.json({ error: "This consultation request has already been received." }, { status: 409 });
  return NextResponse.json({ reply: cleanReply || "Thank you. Our project director will be in touch shortly.", mode, leadCaptured: { reference: lead.reference } });
}