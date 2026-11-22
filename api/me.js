// Tells the page who is signed in and how many free messages they have left today.
import { accountsOn, getUser, getUsage, json } from "./_accounts.js";
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (!accountsOn()) return json({ accounts: false });
  const user = await getUser(req);
  if (!user) return json({ signedIn: false }, 401);
  try {
    const usage = await getUsage(user.id);
    return json({ signedIn: true, email: user.email, ...usage });
  } catch (e) {
    console.error(e);
    return json({ signedIn: true, email: user.email, error: "usage unavailable" }, 500);
  }
}
