# Debate Lab

Debate Lab is a strict-TypeScript React/Express application for structured debates against local Ollama or user-configured cloud AI providers. The browser contains presentation and interaction controllers, the API owns validation and application services, provider adapters isolate external AI APIs, and PostgreSQL is the persistence boundary.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- Ollama, or an OpenAI, Anthropic, Google, or Groq API key

## Local setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
docker compose up -d postgres ollama
docker compose exec ollama ollama pull llama3.2:1b
npm run migrate
npm run seed
```

Run `npm run dev:server` and `npm run dev:client` in separate terminals, then open <http://localhost:5173>. Register, choose a seeded topic, create a debate, exchange messages, and end the debate to generate its assessment.

## Production

Replace every sample secret and database credential, set `NODE_ENV=production`, configure HTTPS at the reverse proxy, and set `FRONTEND_URL` and `VITE_API_URL` to their public HTTPS origins. Build with `npm run build`; serve `client/dist` from a static host and run the API with `npm start --workspace server`. Run migrations before starting a new release.

Configuration is parsed before initialization. The server refuses to start when database, JWT, encryption, URL, or numeric settings are invalid, and the browser fails immediately for an invalid API URL.

## Verification

`npm run check` performs both production builds, strict TypeScript compilation, and frontend linting. `GET /health` is the process liveness endpoint; authenticated feature routes remain dependent on PostgreSQL and the selected AI provider.
