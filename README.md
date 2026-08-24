# personal-portfolio

The source of my personal site — a single page introducing who I am, what I've
worked on, and a contact form that reaches my inbox.

Next.js 15 (App Router) and React 19 in TypeScript, styled with Tailwind CSS v4
over shadcn/ui primitives, animated with Framer Motion. Vercel deploys it.

## Getting started

```bash
npm install
npm run dev
```

**The dev server will not start without configuration**, and that is deliberate
rather than a rough edge: a missing key fails the build instead of quietly
serving a contact form that cannot work. Four variables in `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Renders the Turnstile widget. Checked in `next.config.ts`. |
| `TURNSTILE_SECRET_KEY` | Yes | Verifies the token with Cloudflare. |
| `EMAIL_USER` | Yes | The account contact mail is sent from. |
| `EMAIL_PASSWORD` | Yes | That account's password. |
| `EMAIL_RECIPIENT` | No | Where contact mail is delivered. Falls back to `EMAIL_USER`. |

For the Turnstile pair, `scripts/setup-turnstile.sh` is a wizard that walks
through creating the site at Cloudflare and writes the keys to `.env.local`.
Everything else — what each variable does in production, how to check the
pipeline actually works, and what to watch for when it doesn't — is in
[Operating the contact pipeline](docs/operations/contact-pipeline.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on [localhost:3000](http://localhost:3000), Turbopack. |
| `npm run build` | Production build. |
| `npm start` | Serve a build. |
| `npm run lint` | ESLint, warnings are errors. |
| `npm test` | Vitest in watch mode. |
| `npm run test:run` | Vitest once — what CI runs. |

CI runs lint and the test suite on every pull request.

## How it's put together

One page, `app/page.tsx`, made of sections. The sections are not written out
there by hand: `lib/page-outline.ts` is the single list of what the page
contains, and the navigation, the anchors, and the visible headings all read
from it. Renaming a section in one place renames it everywhere.

The contact form is the only part of the site with a server behind it. A
submission is validated by the same module in the browser and on the server
(`lib/contact-message.ts`), has to carry a passed Cloudflare Turnstile
Challenge, and then becomes an email — or one of four named outcomes that the
form words for the visitor. `lib/contact-wire.ts` defines the shape the two
sides exchange, so neither infers an outcome from a status code.

Before changing any of that, read **[CONTEXT.md](CONTEXT.md)**. It defines the
vocabulary this codebase uses — Contact Message, Challenge, Page Outline, Page
Section, Timeline Item, Timeline Section — and the terms mean specific things
in the code and in review.

## Branches

`main` is production. A ruleset requires every change to arrive by pull
request; direct pushes, force pushes, and deletion are blocked.

`dev` is the integration branch and the repo's default. Branch from `dev` and
open pull requests against `dev`. Promoting to production is a `dev` → `main`
pull request.

## Documentation

| Where | What |
| --- | --- |
| [CONTEXT.md](CONTEXT.md) | The domain glossary. Start here. |
| [docs/adr/](docs/adr/) | Why the design is what it is — the decisions and their costs. |
| [docs/operations/](docs/operations/) | Runbooks for the parts that live outside this repo. |
| [docs/agents/](docs/agents/) | Conventions for agents working in this repo. |
| [CLAUDE.md](CLAUDE.md) | The entry point for agents. |
