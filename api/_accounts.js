// Shared helpers for Wisely accounts and daily limits (uses Supabase).
// Files starting with "_" in the api folder are helpers, not web addresses.

export const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 23);

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || "";
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Accounts turn on only after all three Supabase settings are added in Vercel.
// Until then Wisely works like before, with no sign-in.
export const accountsOn = () => !!(URL_ && PUBLIC_KEY && SECRET_KEY);

export const publicConfig = () =>
  accountsOn() ? { accounts: true, supabaseUrl: URL_, supabaseKey: PUBLIC_KEY, freeLimit: FREE_DAILY_LIMIT } : { accounts: false };

// New-style Supabase secret keys go only in "apikey"; old-style ones also go in Authorization.
function secretHeaders() {
  const h = { apikey: SECRET_KEY, "content-type": "application/json" };
  if (!SECRET_KEY.startsWith("sb_secret_")) h.authorization = `Bearer ${SECRET_KEY}`;
  return h;
}

// Works out who is signed in from the token the page sends. Returns null if nobody.
export async function getUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const res = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user && user.id ? user : null;
}

async function rpc(name, args) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: "POST", headers: secretHeaders(), body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`Supabase ${name} failed: ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

// Counts one message. Returns { allowed, plan, used, limit }.
export const useMessage = (userId) => rpc("use_message", { uid: userId, free_limit: FREE_DAILY_LIMIT });
// Gives the message back if the AI failed, so errors don't eat someone's limit.
export const refundMessage = (userId) => rpc("refund_message", { uid: userId }).catch(e => console.error(e));
// Just looks at today's count without using one.
export const getUsage = (userId) => rpc("get_usage", { uid: userId, free_limit: FREE_DAILY_LIMIT });

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
