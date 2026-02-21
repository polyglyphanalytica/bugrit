# CLAUDE.md — Project context for Claude Code

## Project

Bugrit is a SaaS web application for automated bug detection and code quality scanning. Built with Next.js 15 (App Router), Firebase (Auth + Firestore), Stripe billing, and deployed via Firebase App Hosting.

## Commands

```bash
npm run dev           # Start dev server (Turbopack, port 9002)
npm run build         # Production build (Next.js)
npm run typecheck     # TypeScript type checking (tsc --noEmit)
npm run lint          # ESLint via next lint
npm run test          # Run tests (Vitest)
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage report
npm run setup:secrets # Interactive secret provisioning agent
```

## Architecture

- **Framework**: Next.js 15 with App Router (`src/app/`)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Auth**: Firebase Authentication
- **Database**: Firestore
- **Billing**: Stripe (3 paid tiers: Solo $19/mo, Scale $49/mo, Business $99/mo)
- **Hosting**: Firebase App Hosting (`apphosting.yaml`)
- **CI**: Cloud Build (`cloudbuild.yaml`)
- **Testing**: Vitest (tests in `src/**/*.test.ts`)
- **Linting**: ESLint flat config (`eslint.config.mjs`)

## Key directories

- `src/app/` — Next.js pages and API routes
- `src/lib/` — Core business logic (subscriptions, admin, scanning)
- `src/components/` — React UI components
- `scripts/` — Operational scripts (setup-secrets, deploy-worker, etc.)
- `worker/` — Cloud Run scan worker (Puppeteer/Chromium)
- `functions/` — Firebase Cloud Functions
- `infra/` — Infrastructure config

## Secrets & environment

All secrets are managed via GCP Secret Manager and referenced in `apphosting.yaml`. Use `npm run setup:secrets` to provision them interactively. The script handles Firebase SDK config extraction, Stripe product/price creation, crypto key generation, and GCP provisioning.

Local development uses `.env.local` (gitignored). See `.env.example` for the full list.

## Environment

This project runs in Firebase Studio (Nix-based cloud IDE). System packages are managed in `.idx/dev.nix`. The Nix environment includes Node.js 20, stripe-cli, and Claude Code CLI.

## Conventions

- Prefer editing existing files over creating new ones
- Tests live alongside source files as `*.test.ts` / `*.test.tsx`
- Run `npm run typecheck && npm run lint && npm run test` before committing
- Commit messages: imperative mood, concise summary line, details in body
