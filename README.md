# Slate & Timber Co.

A residential design-build studio site built with Next.js App Router, TypeScript, Tailwind CSS v4, Drizzle ORM, and PostgreSQL.

## Run locally

Use Node.js 22 or newer and PostgreSQL 16. Copy `.env.example` to `.env.local`, set `DATABASE_URL` to your PostgreSQL connection string, then run:

```sh
npm ci
npx drizzle-kit push
npm run dev
```

The site is available at `http://localhost:3000`. Without a supported AI provider key, the concierge uses its clearly labeled scripted fallback. Set `MAKE_WEBHOOK_URL` to deliver leads to an automation endpoint; when unset, lead delivery is sent to the local mock endpoint and recorded as simulated.

## Codespaces AI key

Add `API_KEY` under **GitHub → Settings → Codespaces → Secrets**, then rebuild or restart the Codespace. The key stays server-side and is never exposed through a `NEXT_PUBLIC_` variable. Supported key prefixes select Groq (`gsk_`), Gemini (`AIza`), or OpenAI (`sk-`).

## Database

Apply the current schema with `npx drizzle-kit push`. The development container starts PostgreSQL 16, waits for its health check, and applies the schema on start. Its bundled database and credentials are for development only; use a managed, access-controlled PostgreSQL instance for production.

## Lead delivery

Inquiry and chat leads are inserted before delivery. A configured `MAKE_WEBHOOK_URL` receives JSON with one retry for server errors. Without it, the same payload is posted to `/api/webhooks/mock`. Each delivery attempt is recorded in `webhook_events` when the database is available.