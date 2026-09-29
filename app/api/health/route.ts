import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A cheap endpoint for an uptime monitor to poll (UptimeRobot, BetterStack,
 * Vercel checks — anything that can GET a URL and look for a 200).
 *
 * It reports only booleans, never key material: enough to answer "is the AI
 * wired up in this deployment?" at 3am without leaking anything.
 *
 * It also keeps the Supabase project active, alongside the daily workflow.
 */
export async function GET() {
  const aiConfigured = Boolean(
    process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  );

  return NextResponse.json(
    {
      ok: true,
      time: new Date().toISOString(),
      ai: {
        configured: aiConfigured,
        provider: process.env.AI_MEMORY_PROVIDER || "(default order)",
        model: process.env.OPENROUTER_MEMORY_MODEL || "openrouter/free",
      },
      supabase: {
        configured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        ),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
