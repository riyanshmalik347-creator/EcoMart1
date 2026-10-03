# Gaia Eco Agent

A static HTML, CSS and JavaScript experience with a Vercel serverless endpoint for Gaia AI, a sample eco-products catalog, a local demo cart and customizable display settings.

## Deploy to Vercel

1. Import this folder as the project root in Vercel.
2. Add `GEMINI_API_KEY` in the project's Environment Variables if you want connected Gaia AI responses. The site still answers common environmental questions from its local guide when the secret is not configured or the AI service is unavailable.
3. Deploy. Vercel serves `index.html` and maps `api/chat.js` to `POST /api/chat`.

The key belongs only in the server-side `GEMINI_API_KEY` environment variable. Do not put it in the HTML, CSS or browser JavaScript. The provided local development value is kept in the ignored `.env.local` file; do not commit or share that file. Production deployments need the same variable set in the Vercel project's Environment Variables.

## Run locally

Use Vercel's local runtime so `/api/chat` is available alongside the static page. With the Vercel CLI installed, run `vercel dev` from this folder. Set `GEMINI_API_KEY` in the local environment if you want to try connected responses; without it, the API route uses Gaia's offline environmental guide.

The live weather panel asks for location only after the visitor selects **Use my location**. It requests a current weather-model snapshot from Open-Meteo and keeps coordinates in page memory for refresh; no account or location storage is used.

The shop lists sample products and INR prices. Cart changes are stored locally in the browser. The UPI and cash-on-delivery choices confirm a demo order only; they do not start a real payment, notify a seller or arrange delivery. Theme, accent colour, text size and contrast preferences are also stored locally.
