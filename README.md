# Token Dashboard

A Next.js App Router dashboard for reviewing AI provider usage and cost data across Anthropic and OpenAI admin APIs.

## Open Source

This project is designed to be cloned and run with each user's own provider admin keys. No provider keys are committed to the repository, and the browser UI does not store or transmit admin keys.

## What It Does

- Stores provider admin API keys only in server environment variables.
- Proxies dashboard requests through Next.js route handlers so provider keys are never exposed to the browser.
- Shows overview, usage, cost, and Claude Code views for configured providers.
- Supports Anthropic usage, costs, Claude Code usage, and tool-use usage.
- Supports OpenAI completions, costs, embeddings, images, audio, and code-interpreter usage.
- Provides date, granularity, and provider-supported group-by filters.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`. The dashboard reads configured providers from server environment variables.

## Provider Keys

Create `.env.local` from `.env.example` and set one or more server-side admin keys:

```bash
ANTHROPIC_ADMIN_KEY=<your-anthropic-admin-key>
OPENAI_ADMIN_KEY=<your-openai-admin-key>
```

- Anthropic requires an Admin API key from the Anthropic Console organization settings.
- OpenAI requires an Admin API key from platform.openai.com organization API keys.

Keys are never entered in the browser, stored in browser local storage, or sent by client-side fetches. Next.js route handlers read the relevant server environment variable and call the selected provider API from the server.

## Security

This app handles organization-level admin usage data. For local use, keep keys in `.env.local`. For hosted use, configure keys in the hosting provider's secret manager and put the app behind authentication or network access controls.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## Validation

```bash
npx tsc --noEmit
npm run lint
npm run build
```

`npm run build` may need network access because the app uses `next/font` to fetch Geist fonts during production build.
