# personal-portfolio

## Branches

`main` is production — Vercel deploys it. A ruleset requires every change to
arrive by pull request; direct pushes, force pushes, and deletion are blocked.

`dev` is the integration branch and the repo's default. Branch from `dev` and
open pull requests against `dev`, never against `main`. Promoting to production
is a `dev` → `main` pull request.

## Issues

Issues live as GitHub issues in `mikepeerawit/personal-portfolio`, managed with the `gh` CLI.

## Domain docs

Single-context: the glossary is `CONTEXT.md` and the decisions are `docs/adr/`, both at the repo root. Read the ADRs that touch an area before working in it.

- Name domain concepts (in issues, code, tests, commits) with the terms `CONTEXT.md` defines; don't drift to synonyms it avoids.
- If a change contradicts an ADR, say so explicitly rather than silently overriding it.
