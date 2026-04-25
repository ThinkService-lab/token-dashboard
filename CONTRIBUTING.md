# Contributing

Thanks for helping improve Token Dashboard.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Add your own provider admin keys to `.env.local`.

4. Run the app:

```bash
npm run dev
```

## Validation

Before opening a pull request, run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Security Rules

- Do not commit `.env.local` or real provider keys.
- Keep admin keys server-side only.
- Do not add client-side key storage.
- Do not expose raw provider API responses if they may contain sensitive account data.
