# Wisely AI 🦉

Your own AI chatbot website, made by Kiaan Sangra.

```
wisely-site/
├── index.html     ← the website people see
├── api/chat.js    ← the secret server part that talks to the AI
└── package.json
```

## Put it online (about 15 minutes)

### 1. Get an API key (a parent may need to do this)
1. Go to **console.anthropic.com** and make an account.
2. Add a payment method under **Billing**. Start small, like $5 of credit.
3. **Set a monthly spending limit** under **Limits** so you can never get a surprise bill.
4. Go to **API Keys**, click **Create Key**, and copy it. It starts with `sk-ant-`.
   **Never share it or paste it into index.html.**

### 2. Put the code on GitHub
1. Make a free account at **github.com**.
2. Click **New repository**, name it `wisely-ai`, and create it.
3. Click **uploading an existing file** and drag in everything from this folder,
   **including the `api` folder**. Click **Commit changes**.

### 3. Launch it on Vercel
1. Go to **vercel.com** and sign up with your GitHub account (it's free).
2. Click **Add New → Project** and pick your `wisely-ai` repo.
3. Open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from step 1
4. Click **Deploy**. After about a minute you'll get a link like `wisely-ai.vercel.app`. 🎉

## Changing things
- **Personality or modes:** edit the `BASE` and `MODES` text in `api/chat.js`.
- **Smarter answers:** change `MODEL` in `api/chat.js` to `claude-sonnet-5-5` (costs more per message).
- After any change, upload the new file to GitHub. Vercel updates the site by itself.

## Good to know
- Every message costs a tiny amount from your API credit, including messages from other people using your site.
  The spending limit is your safety net.
- Chats are saved in each visitor's own browser, so nobody can see anyone else's chats.
