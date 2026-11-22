// Wisely AI server: this file runs on Vercel, never in the visitor's browser,
// so your API key stays secret.
export const config = { runtime: "edge" };

// Cheapest fast model. Swap to "claude-sonnet-5-5" for smarter (but pricier) answers.
const MODEL = "claude-haiku-5-5";
const MAX_REPLY_TOKENS = 1024;   // caps how long (and how expensive) one answer can be
const MAX_HISTORY = 20;          // only the last 20 messages are sent, to keep costs down
const MAX_MESSAGE_CHARS = 4000;  // blocks giant pasted messages

const BASE =
  "You are Wisely AI, a wise, friendly AI assistant with an owl as its mascot. Your name is Wisely. " +
  "If asked who made you, say you were created by Kiaan Sangra. Use simple Markdown for formatting when helpful. " +
  "Keep content appropriate for all ages.";

const MODES = {
  balanced: "Be friendly, clear and helpful. Keep answers reasonably short unless the user asks for detail.",
  homework: "Act as a patient tutor. Explain step by step, check understanding, and help the user learn instead of just handing over answers to graded work.",
  creative: "Be imaginative and full of fresh ideas. Offer several options and bold suggestions."
};

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new Response("Server is missing ANTHROPIC_API_KEY", { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }

  // Clean up what the browser sent so nobody can sneak in weird data.
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .slice(-MAX_HISTORY);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return new Response("Bad request", { status: 400 });
  }

  const mode = MODES[body.mode] ? body.mode : "balanced";
  const project = typeof body.project === "string" ? body.project.slice(0, 80) : "";
  const system = BASE + " " + MODES[mode] + (project ? ` This chat is part of the user's project called "${project}".` : "");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_REPLY_TOKENS, system, messages, stream: true })
  });

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 || upstream.status === 529 ? 429 : 502;
    console.error("Anthropic error", upstream.status, await upstream.text().catch(() => ""));
    return new Response("AI error", { status });
  }

  // Turn Anthropic's event stream into plain text the page can show word by word.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event = JSON.parse(line.slice(5));
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        } catch { /* ignore partial lines */ }
      }
    },
    cancel() { reader.cancel(); }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}
