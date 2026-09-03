# Debate Lab

Debate Lab is a application for structured debates against user-configured AI providers. The browser contains presentation and interaction controllers, the API owns validation and application services, provider adapters isolate external AI APIs, and PostgreSQL is the persistence boundary.

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
