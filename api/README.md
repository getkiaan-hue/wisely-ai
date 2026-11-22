# Wisely AI 🦉

Your own AI chatbot website, made by Kiaan Sangra.

```
wisely-site/
├── index.html            ← the website people see
├── api/chat.js           ← the secret server part that talks to the AI
├── api/config.js         ← tells the page if sign-in is turned on
├── api/me.js             ← tells the page how many messages are left today
├── api/_accounts.js      ← shared sign-in and limit code
├── supabase-setup.sql    ← paste this into Supabase once (accounts)
└── package.json
```

When you upload updates to GitHub, drag the whole **api** folder (not just the files inside it),
so everything stays in the right place.

## Put it online

### 1. Get a free Gemini API key (a parent may need to do this)
1. Go to **aistudio.google.com** and sign in with a Google account.
2. Click **Get API key**, then **Create API key**, and copy it.
   **Never share it or paste it into index.html.**

### 2. Put the code on GitHub
1. Make a free account at **github.com**.
2. Click **New repository**, name it `wisely-ai`, and create it.
3. Click **uploading an existing file** and drag in everything from this folder,
   **including the `api` folder**. Click **Commit changes**.

### 3. Launch it on Vercel
1. Go to **vercel.com** and sign up with your GitHub account (it's free).
2. Click **Add New → Project** and pick your `wisely-ai` repo.
3. Open **Environment Variables** and add `GEMINI_API_KEY` with your key from step 1.
4. Click **Deploy**.

## Accounts and the 23-messages-a-day limit (Supabase)

Until you finish these steps, Wisely works like before with no sign-in.
Once all three Supabase settings are in Vercel, people must sign in, and free users get 23 messages a day.

### A. Make a Supabase project (free)
1. Go to **supabase.com** → **Start your project** → sign in (with GitHub is easiest).
2. Click **New project**. Name: `wisely`. Make a database password and save it somewhere safe.
   Region: **East US**. Plan: **Free**. Click **Create new project** and wait about a minute.

### B. Create the usage table
1. In your Supabase project, click **SQL Editor** on the left → **New query**.
2. Open `supabase-setup.sql` in Notepad (right-click → Open with → Notepad), copy everything, paste it in.
3. Click **Run**. It should say "Success. No rows returned."

### C. Tell Supabase your website address
1. Click **Authentication** → **URL Configuration**.
2. **Site URL:** `https://wisely-ai-tawny.vercel.app`
3. **Redirect URLs:** click **Add URL** and add `https://wisely-ai-tawny.vercel.app/**`
4. Click **Save**.

### D. Copy three settings into Vercel
1. In Supabase, click **Project Settings** (gear icon) → **API Keys** (or **Data API**).
2. In Vercel: your project → **Settings** → **Environment Variables**. Add:
   - `SUPABASE_URL`: the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - `SUPABASE_ANON_KEY`: the **publishable** key (or the one called **anon**)
   - `SUPABASE_SERVICE_ROLE_KEY`: the **secret** key (or the one called **service_role**)
     **This one is like a master password. Only ever paste it into Vercel.**
3. Go to **Deployments** → **⋯** next to the newest one → **Redeploy**.

### E. Test it
Open your Wisely link. You should see "Sign in to Wisely". Type your email, click the link in the
email, and you're in. The bottom of the sidebar shows how many free messages are left today.

## Handy things
- **Change the daily limit:** add `FREE_DAILY_LIMIT` in Vercel's Environment Variables (for example `30`), then Redeploy.
- **Give someone Pro for free:** Supabase → **Table Editor** → **usage** → find their row → change `plan` from `free` to `pro`.
- **Personality or modes:** edit `BASE` and `MODES` in `api/chat.js`.
- **Model:** `MODEL` in `api/chat.js`. `gemini-3.1-flash-lite` is fast and cheap; `gemini-3.5-flash` is smarter.

## Good to know
- Supabase's built-in email can only send a few sign-in emails per hour. That's fine for you and friends;
  for lots of users you'd connect your own email service later.
- Chats are saved in each person's own browser. Sign-in is only for the daily limit.
- On Google's free tier, Google may use messages to improve its products, so don't type private info into Wisely.
