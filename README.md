# Wisely AI 🦉

Your own AI chatbot website, made by Kiaan Sangra.

```
wisely-site/
├── index.html     ← the website people see
├── api/chat.js    ← the secret server part that talks to the AI
└── package.json
```

## Put it online (about 15 minutes)

### 1. Get a free Gemini API key (a parent may need to do this)
1. Go to **aistudio.google.com** and sign in with a Google account.
2. Click **Get API key**, then **Create API key**, and copy it.
   **Never share it or paste it into index.html.**
3. Don't add billing. Without billing, it stays on the free tier.

### 2. Put the code on GitHub
1. Make a free account at **github.com**.
2. Click **New repository**, name it `wisely-ai`, and create it.
3. Click **uploading an existing file** and drag in everything from this folder,
   **including the `api` folder**. Click **Commit changes**.

### 3. Launch it on Vercel
1. Go to **vercel.com** and sign up with your GitHub account (it's free).
2. Click **Add New → Project** and pick your `wisely-ai` repo.
3. Open **Environment Variables** and add:
   - Name: `GEMINI_API_KEY`
   - Value: your key from step 1
4. Click **Deploy**. After about a minute you'll get a link like `wisely-ai.vercel.app`. 🎉

## Changing things
- **Personality or modes:** edit the `BASE` and `MODES` text in `api/chat.js`.
- After any change, upload the new file to GitHub. Vercel updates the site by itself.

## Good to know
- It's free, but the free tier has a daily limit on messages. If lots of people use it, Wisely may say it's resting until tomorrow.
- On the free tier, Google may use messages to improve its products, so don't type private info into Wisely.
- Chats are saved in each visitor's own browser, so nobody can see anyone else's chats.
