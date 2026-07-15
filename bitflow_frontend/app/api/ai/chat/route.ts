/**
 * app/api/ai/chat/route.ts — BitFlow AI Assistant API endpoint
 *
 * Path: POST /api/ai/chat
 *
 * This is the ONLY place where API keys are used.
 * They are read from server-side environment variables (.env.local).
 * API keys are NEVER sent to the browser.
 *
 * Why /api/ai/chat and not /api/ai?
 *   The useAI hook calls fetch("/api/ai/chat", ...) for semantic clarity.
 *   Next.js API routes take precedence over rewrites, so this file is
 *   handled server-side before the /api/* → FastAPI proxy rewrite fires.
 *
 * Request body (POST):
 *   {
 *     messages: AIMessage[]   // full conversation history
 *     context:  IDEContext    // current editor + simulation state
 *   }
 *
 * Response:
 *   {
 *     content:    string        // AI response text
 *     tokensUsed: number | null // actual usage; null if provider omits it
 *     provider:   string        // "openai" | "gemini" | "anthropic"
 *   }
 *
 * Error response:
 *   { error: string }  — with appropriate 4xx/5xx status
 *
 * TODO: Add per-session rate limiting
 * TODO: Add credit deduction when Oogway credit system launches
 * TODO: Add streaming (ReadableStream + SSE) for long responses
 * TODO: Add request signing/validation for production
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider }               from "@/lib/ai-providers";
import {
  SANDBOX_SYSTEM_PROMPT,
  buildContextMessage,
}                                    from "@/lib/ai-prompts";
import type { AIMessage }            from "@/lib/ai-providers";
import type { IDEContext }           from "@/lib/ai-prompts";

interface RequestBody {
  messages: AIMessage[];
  context:  IDEContext;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    // ── Input validation ────────────────────────────────────────────────────
    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "messages must be an array" },
        { status: 400 },
      );
    }

    if (body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is empty" },
        { status: 400 },
      );
    }

    // ── Build full message list ─────────────────────────────────────────────
    // The context message is injected before the conversation history so the
    // AI always sees the current editor state, even mid-conversation.
    // We skip injection if the history already starts with a context message
    // (identified by the [Current IDE State] prefix) to avoid duplication.
    const contextMessage: AIMessage = {
      role:    "user",
      content: buildContextMessage(body.context),
    };

    const firstMsg  = body.messages[0];
    const hasContext =
      firstMsg?.role === "user" &&
      firstMsg.content.startsWith("[Current IDE State]");

    const messages: AIMessage[] = hasContext
      ? body.messages
      : [contextMessage, ...body.messages];

    // ── Dispatch to configured provider ─────────────────────────────────────
    const provider = getProvider();
    const response = await provider.chat(messages, SANDBOX_SYSTEM_PROMPT);

    return NextResponse.json(response);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";

    // Log server-side (never leaks API keys — we only log the message string)
    console.error("[BitFlow AI] /api/ai/chat error:", message);

    // Return a generic error to the client for provider auth failures to avoid
    // leaking which provider is configured or key format details.
    const isAuthError = /api key|unauthorized|authentication/i.test(message);
    const clientMessage = isAuthError
      ? "AI provider authentication failed. Check server environment variables."
      : message;

    return NextResponse.json(
      { error: clientMessage },
      { status: isAuthError ? 503 : 500 },
    );
  }
}