# my-chatbot

A public web chatbot. The AI provider key is kept secret on the server (Vercel environment variable) — visitors never see it.

## Setup after deploying to Vercel
1. In your Vercel project, go to Settings -> Environment Variables
2. Add:
   - OPENROUTER_API_KEY = your OpenRouter key
   - OPENROUTER_MODEL = openai/gpt-4o-mini (optional, this is the default)
3. Redeploy

## Run locally
```
npm install
npm run dev
```
Note: the /api/chat function only works when deployed on Vercel (or run via `vercel dev`), since it's a serverless function.
