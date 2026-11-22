// Wisely AI server (free version, powered by Google Gemini's free tier).
// This file runs on Vercel, never in the visitor's browser, so your API key stays secret.
export const config = { runtime: "edge" };

const MODEL = "gemini-3.5-flash";  // has a free tier; "gemini-3.1-flash-lite" is a backup option
const MAX_REPLY_TOKENS = 8192;     // caps how long one answer can be
const MAX_HISTORY = 20;            // only the last 20 messages are sent
const MAX_MESSAGE_CHARS = 4000;    // blocks giant pasted messages
const MAX_FILE_TEXT = 100000;      // max characters read from one text/doc file
const MAX_INLINE_BYTES = 4200000;  // total size of photos/PDFs in one request
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

const BASE =
  "You are Wisely AI, a wise, friendly AI assistant with an owl as its mascot. Your name is Wisely. " +
  "If asked who made you, say you were created by Kiaan Sangra. Use simple Markdown for formatting when helpful. " +
  "Users can attach photos, PDFs and documents, and share links; when they do, look at them carefully and use them in your answer. " +
  "Keep content appropriate for all ages.";

const MODES = {
  balanced: "Be friendly, clear and helpful. Keep answers reasonably short unless the user asks for detail.",
  homework: "Act as a patient tutor. Explain step by step, check understanding, and help the user learn instead of just handing over answers to graded work.",
  creative: "Be imaginative and full of fresh ideas. Offer several options and bold suggestions."
};

const NO_ANSWER =
  "🦉 Hmm, I couldn't come up with an answer for that one. It may have been blocked by a safety filter. Try asking a different way.";

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response("Server is missing GEMINI_API_KEY (error 500)", { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response("Bad request (error 400)", { status: 400 }); }

  // Turn what the browser sent into Gemini's format, checking everything along the way.
  let inlineBytes = 0;
  const contents = [];
  const raw = (Array.isArray(body.messages) ? body.messages : []).slice(-MAX_HISTORY);
  for (const m of raw) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const parts = [];
    if (m.role === "user" && Array.isArray(m.attachments)) {
      for (const a of m.attachments.slice(0, 5)) {
        const name = String(a.name || "file").slice(0, 100);
        if (typeof a.data === "string" && ALLOWED_TYPES.includes(a.mimeType)) {
          inlineBytes += a.data.length;
          if (inlineBytes > MAX_INLINE_BYTES) return new Response("Files too big (error 413)", { status: 413 });
          parts.push({ text: `[Attached file: ${name}]` });
          parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
        } else if (typeof a.text === "string") {
          parts.push({ text: `[Attached file: ${name}]\n${a.text.slice(0, MAX_FILE_TEXT)}\n[End of ${name}]` });
        } else {
          parts.push({ text: `[The user attached "${name}" earlier, but it is no longer available.]` });
        }
      }
    }
    const text = typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_CHARS) : "";
    if (text.trim()) parts.push({ text });
    if (!parts.length) continue;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }
  while (contents.length && contents[0].role !== "user") contents.shift();
  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return new Response("Bad request (error 400)", { status: 400 });
  }

  const mode = MODES[body.mode] ? body.mode : "balanced";
  const project = typeof body.project === "string" ? body.project.slice(0, 80) : "";
  // Tell Wisely today's date (Eastern Time), so it doesn't think it's still the year its training ended.
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const system = BASE + " " + MODES[mode] +
    ` Today's date is ${today}. Use it for anything involving ages, years or "how long ago".` +
    " Your knowledge comes from training data that ends before today, so you may not know about recent events" +
    " (for example, whether a famous person has died, or who currently holds a job). When a question depends on recent news," +
    " give what you know, say it might be out of date, and suggest checking a news site or pasting a link." +
    (project ? ` This chat is part of the user's project called "${project}".` : "");

  // If the newest message has a link in it, let Gemini open and read the page.
  const lastText = contents[contents.length - 1].parts.map(p => p.text || "").join(" ");
  const hasLink = /https?:\/\/\S+/i.test(lastText);

  // "Low" thinking makes answers start much faster. If Gemini doesn't accept an option,
  // try again without it (first without fast mode, then without link reading).
  const callGemini = ({ links, fast }) => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        ...(links ? { tools: [{ urlContext: {} }] } : {}),
        generationConfig: { maxOutputTokens: MAX_REPLY_TOKENS, ...(fast ? { thinkingConfig: { thinkingLevel: "low" } } : {}) }
      })
    }
  );

  const opts = { links: hasLink, fast: true };
  let upstream = await callGemini(opts);
  while (!upstream.ok && upstream.status === 400 && (opts.fast || opts.links)) {
    console.error("Gemini said 400, retrying with fewer options:", await upstream.text().catch(() => ""));
    if (opts.fast) opts.fast = false; else opts.links = false;
    upstream = await callGemini(opts);
  }

  if (!upstream.ok || !upstream.body) {
    console.error("Gemini error", upstream.status, await upstream.text().catch(() => ""));
    const status = upstream.status === 429 ? 429 : 502;
    return new Response(`AI error (error ${upstream.status})`, { status });
  }

  // Turn Gemini's event stream into plain text the page can show word by word.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let gotText = false;

  const handleLine = (line, controller) => {
    if (!line.startsWith("data:")) return;
    try {
      const event = JSON.parse(line.slice(5));
      if (event.promptFeedback?.blockReason) console.error("Blocked:", event.promptFeedback.blockReason);
      const parts = event.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.text && !p.thought) { gotText = true; controller.enqueue(encoder.encode(p.text)); }
      }
    } catch { /* ignore partial lines */ }
  };

  // Read Gemini's whole answer in one loop and always close the stream at the end,
  // so the page knows the answer is finished (even if the last piece has no text in it).
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) handleLine(line.trim(), controller);
        }
        if (buffer) handleLine(buffer.trim(), controller);
        if (!gotText) controller.enqueue(encoder.encode(NO_ANSWER));
      } catch (e) {
        console.error("Stream error", e);
        if (!gotText) controller.enqueue(encoder.encode(NO_ANSWER));
      }
      controller.close();
    },
    cancel() { reader.cancel(); }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}
