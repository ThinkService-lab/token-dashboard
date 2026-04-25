# Security Policy

## Secrets

Do not commit provider admin API keys or `.env.local` files.

This app is designed so Anthropic and OpenAI admin keys stay on the server in
environment variables:

- `ANTHROPIC_ADMIN_KEY`
- `OPENAI_ADMIN_KEY`

Browser code should never receive, store, log, or forward these keys.

## Deployment

Before deploying publicly, put the app behind authentication or network access
controls. Admin usage and cost APIs expose organization-level data, so a public
deployment without access control is not appropriate.

## Reporting Issues

Please avoid opening public issues that contain secrets, tokens, request
headers, organization IDs, or private usage data. Rotate any exposed provider
keys immediately.
