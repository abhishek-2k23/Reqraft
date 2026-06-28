# Reqraft

Reqraft is an AI-assisted product delivery platform for modern software teams.

It turns messy feature requests into structured PRDs, engineering tasks, GitHub-connected pull request reviews, fix loops, human approval, and shipped releases.

Core workflow:

```text
Feature Request
  -> AI Clarification
  -> PRD
  -> Engineering Tasks
  -> GitHub Pull Request
  -> AI Review
  -> Fixes / Re-review
  -> Human Approval
  -> Shipped
```

## Tech Stack

- Turborepo and pnpm for monorepo orchestration
- Next.js App Router for the web product
- tRPC for type-safe API contracts
- Drizzle ORM and PostgreSQL for relational SaaS data
- shadcn/ui-style primitives for product UI
- Zod for validation and API output contracts
- Inngest for long-running AI workflows
- Octokit for GitHub App integration
- BetterAuth for authentication and organizations
- Razorpay for subscriptions and AI credit billing
- Vercel AI SDK + Anthropic for production AI calls

## Current Implementation

This repo currently includes:

- A polished multi-page SaaS UI:
  - Landing page
  - Dashboard
  - Feature requests
  - Feature detail
  - PRD view
  - Engineering task board
  - AI review history
  - GitHub integration page
  - Billing page
  - Workspace settings
- A tested domain workflow package:
  - Feature request validation
  - Feature lifecycle transitions
  - Dashboard progress summaries
  - Deterministic clarification, PRD, and review agent logic
- Drizzle schema for:
  - BetterAuth users, sessions, accounts, and verifications
  - Organizations
  - Members
  - Invitations
  - Projects
  - Repositories
  - Feature requests
  - PRDs
  - Tasks
  - Pull requests
  - AI reviews
  - Approvals
  - Usage events
- tRPC route for the Reqraft workspace snapshot
- BetterAuth route for GitHub sign-in and organization-aware sessions
- GitHub webhook route that verifies signatures and queues PR review jobs
- Inngest route with PRD generation and PR review functions
- Razorpay webhook route that verifies subscription events
- GitHub Actions CI for tests, type checking, linting, and production builds

## Monorepo Structure

```text
apps/
  web/                  Next.js product app

packages/
  database/             Drizzle schema and DB client
  services/             Product workflow and agent logic
  trpc/                 Type-safe API router
  logger/               Shared logging package
  eslint-config/        Shared lint config
  typescript-config/    Shared TypeScript config
```

The old standalone Express API template was removed because Reqraft uses the Next.js app and shared tRPC package as the main product surface.

## Setup

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Verification

Run tests:

```bash
pnpm test
```

Run type checks:

```bash
pnpm check-types
```

Run lint:

```bash
pnpm lint
```

Run production build:

```bash
pnpm build
```

## Environment Variables

The current demo runs without external secrets.

Production integrations will need:

```text
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_APP_URL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Database Notes

The schema lives in:

```text
packages/database/models/user.ts
packages/database/models/shipflow.ts
```

Generate migrations:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

## AI Workflow Notes

The current service layer includes deterministic testable agent logic in:

```text
packages/services/shipflow/agents.ts
```

Production AI calls are wrapped through Vercel AI SDK + Anthropic in:

```text
apps/web/lib/ai.ts
apps/web/lib/inngest.ts
```

The AI workflow covers:

- Clarification questions
- PRD structured output
- Task generation
- PRD-aware code review
- Release readiness checks

## GitHub Integration Notes

The GitHub integration entry points are:

```text
apps/web/lib/github-app.ts
apps/web/app/api/github/webhook/route.ts
```

The UI and schema support GitHub App integration:

- Repositories have installation metadata
- Pull requests connect to feature requests
- AI reviews attach findings to PRs
- Review status feeds human approval

Production GitHub integration uses Octokit to:

- Install/connect repositories
- Receive GitHub webhooks
- Fetch changed files and diffs
- Post PR review comments
- Trigger re-review on new commits

## Billing Notes

The billing UI models:

- Current plan
- AI review credits
- Repository limits
- Renewal date

The Razorpay webhook entry point is:

```text
apps/web/lib/razorpay.ts
apps/web/app/api/razorpay/webhook/route.ts
```

The webhook verifies Razorpay signatures and returns normalized subscription event data. The next persistence step is to update organization plan and usage rows from those verified events.

## Hackathon Post

Suggested launch post:

```text
I am building Reqraft, an AI-assisted product delivery platform that turns feature requests into PRDs, tasks, GitHub PR reviews, human approval, and shipped releases.

Builder Mode On | iPhone Giveaway Hackathon

#chaicode
```
