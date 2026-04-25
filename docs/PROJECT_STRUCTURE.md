# Project Structure

## Top Level

- `app/`: Next.js App Router routes and API handlers
- `components/`: Reusable UI building blocks
- `docs/`: Maintainer and contributor documentation
- `hooks/`: Client data and state hooks
- `lib/`: Shared utilities, provider adapters, and server helpers
- `types/`: Shared ambient or cross-module type declarations

## App Routes

- `app/page.tsx`: Root redirect into the first configured provider or settings
- `app/settings/page.tsx`: Provider configuration status and key validation UI
- `app/dashboard/[provider]/`: Provider-specific dashboard views
- `app/api/*/route.ts`: Server endpoints used by the dashboard

## Components

- `components/layout/`: Shell, navigation, and provider tabs
- `components/filters/`: Date range, granularity, and grouping controls
- `components/cards/`: Small KPI summary blocks
- `components/charts/`: Usage and cost visualizations
- `components/settings/`: Settings page UI
- `components/ui/`: Shared primitive components

## Data Layer

- `hooks/useEndpointData.ts`: Shared fetcher for dashboard endpoints
- `hooks/useProviderStatus.ts`: Provider availability and configuration state
- `hooks/use*Data.ts`: Endpoint-specific data hooks
- `lib/providers/`: Provider adapters and normalization logic
- `lib/server/provider-keys.ts`: Server-side key lookup and provider status
- `lib/server/api-route-utils.ts`: Shared route parsing and validation

## Documentation

- `README.md`: Project overview and local setup
- `CONTRIBUTING.md`: Contributor workflow
- `SECURITY.md`: Secrets and deployment guidance
- `docs/ARCHITECTURE.md`: System design and runtime boundaries
- `docs/PROJECT_STRUCTURE.md`: Folder map for maintainers
