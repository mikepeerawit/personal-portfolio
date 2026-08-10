# personal-portfolio

## Branches

`main` is production — Vercel deploys it. A ruleset requires every change to
arrive by pull request; direct pushes, force pushes, and deletion are blocked.

`dev` is the integration branch and the repo's default. Branch from `dev` and
open pull requests against `dev`, never against `main`. Promoting to production
is a `dev` → `main` pull request.

## Agent skills

### Issue tracker

Issues live in the `mikepeerawit/personal-portfolio` GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary, label strings unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
