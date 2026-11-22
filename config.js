// Tells the page whether accounts are turned on, and the PUBLIC Supabase settings it needs.
// (The secret key is never sent to the page.)
import { publicConfig, json } from "./_accounts.js";
export const config = { runtime: "edge" };

export default function handler() {
  return json(publicConfig());
}
