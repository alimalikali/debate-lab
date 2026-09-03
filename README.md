# Debate Lab

Debate Lab is an open-source web application for practicing structured debates
with AI opponents. It combines a React client with an Express API, supports
multiple AI providers, and stores debates and assessments in PostgreSQL.

## Features

- Account registration and authentication
- Curated debate topics and configurable debate sessions
- AI opponents powered by Ollama, OpenAI, Anthropic, Google, or Groq
- Debate history, scoring, feedback, and fallacy detection
- Local-first development with Docker Compose and Ollama

## Tech stack

- **Client:** React, TypeScript, Vite, Tailwind CSS, and shadcn/ui
- **Server:** Node.js, Express, TypeScript, and PostgreSQL
- **AI:** Provider adapters for Ollama, OpenAI, Anthropic, Google, and Groq

## Requirements

- Node.js 20 or newer
- npm
- Docker and Docker Compose (recommended for PostgreSQL and Ollama), or
  equivalent local services
- An Ollama model or an API key for a supported hosted AI provider

## Getting started

1. Clone the repository and install dependencies:

   ```bash
   git clone <your-fork-or-repository-url>
   cd debate-lab
   npm install
   ```

2. Create local environment files:

   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

   The examples are ready for the Docker Compose services. Before deploying,
   replace all sample secrets and review every environment value.

3. Start PostgreSQL and Ollama, then download the default local model:

   ```bash
   docker compose up -d postgres ollama
   docker compose exec ollama ollama pull llama3.2:1b
   ```

4. Prepare the database:

   ```bash
   npm run migrate
   npm run seed
   ```

5. Start the API and client in separate terminals:

   ```bash
   npm run dev:server
   ```

   ```bash
   npm run dev:client
   ```

6. Open <http://localhost:5173>. The API health endpoint is available at
   <http://localhost:3001/health>.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev:client` | Start the Vite development server |
| `npm run dev:server` | Start the API with automatic reloads |
| `npm run migrate` | Apply database migrations |
| `npm run seed` | Seed starter debate topics |
| `npm run build` | Build the server and client |
| `npm run check` | Build both workspaces and lint the client |

## Project structure

```text
.
├── client/             # React application
├── server/             # Express API, database, and AI integrations
├── docker-compose.yml  # Local PostgreSQL and Ollama services
└── package.json        # Workspace scripts
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before
opening an issue or pull request. Participation in this project is governed by
the [Code of Conduct](CODE_OF_CONDUCT.md).

Please report security vulnerabilities privately according to
[SECURITY.md](SECURITY.md), rather than through a public issue.

## License

Debate Lab is licensed under the [MIT License](LICENSE).
