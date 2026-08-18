# my-chatbot

A public web chatbot supporting 2 AI models. Both API keys are kept secret on the server (Vercel environment variables) — visitors never see them.

## Setup after deploying to Vercel
In your Vercel project: Settings -> Environment Variables. Add these for Model 1:
- PROVIDER_1_KEY = your first API key
- PROVIDER_1_MODEL = model name (e.g. openai/gpt-4o-mini)
- PROVIDER_1_ENDPOINT = API endpoint (optional, defaults to OpenRouter's endpoint)

And these for Model 2:
- PROVIDER_2_KEY = your second API key
- PROVIDER_2_MODEL = model name
- PROVIDER_2_ENDPOINT = API endpoint (optional, defaults to OpenRouter's endpoint)

Redeploy after adding/changing variables. Visitors can switch between "Model 1" and "Model 2" from the dropdown in the app header.

## Run locally
```
npm install
npm run dev
```
Note: /api/chat only works when deployed on Vercel (or run via `vercel dev`), since it's a serverless function.
