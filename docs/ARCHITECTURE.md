# Architecture

## Overview

Token Dashboard is a Next.js 16 App Router application for viewing organization
usage and cost data from provider admin APIs.

The browser never receives provider admin keys. All provider requests flow
through server route handlers, which read keys from environment variables and
delegate to provider adapters.

## Runtime Flow

1. A dashboard page reads filter state from client hooks.
2. A client data hook calls an internal route under `app/api/*`.
3. The route handler validates the provider, loads the server environment key,
   and invokes the matching adapter.
4. The adapter fetches provider data and normalizes it into shared UI shapes.
5. Charts and tables render normalized data for the active provider.

## Main Layers

- `app/`: App Router pages, layouts, and route handlers.
- `components/`: UI primitives, layout elements, filters, cards, and charts.
- `hooks/`: Client hooks for filters, provider status, and endpoint data.
- `lib/providers/`: Provider adapters and shared provider types.
- `lib/server/`: Server-only helpers for route handlers and environment key
  access.
- `docs/`: Public project documentation for contributors and maintainers.

## Security Boundaries

- Admin keys live only in server environment variables.
- Client components never accept or persist raw provider keys.
- Route handlers are the only layer allowed to resolve provider keys.
- `lib/server/*` imports `server-only` to keep server utilities out of the
  client bundle.

## Provider Model

Each provider implements the shared `ProviderAdapter` contract in
`lib/providers/types.ts`.

That contract is responsible for:

- Key validation
- Usage data normalization
- Cost data normalization
- Optional provider-specific endpoint support
- Provider metadata such as labels, colors, and supported grouping dimensions

## Current Scope

- Anthropic: usage, costs, Claude Code, tool-use
- OpenAI: usage, costs, embeddings, images, audio

The UI only exposes supported views for configured providers.
