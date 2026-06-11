# Project Memory

## Verified Facts

- The production site is built from source into `dist/` by `scripts/build.mjs`.
- Root files such as `index.html` and `archive/index.html` are publish mirrors, not the primary source of truth.
- `npm run publish:root` is the required publish path for website-output changes.
- `npm run seo:audit` now audits generated `dist/` output, which matches the GitHub Actions deploy artifact.
- `Site Ops` GitHub Action is currently green after the audit/build-path fixes.
- The site has automated GitHub issue + Slack DM alerting for site-ops failures.
- `qa-screens/` is intentionally gitignored; screenshot verification is mandatory for layout changes.

## Failed Attempts And Lessons

- Auditing root output instead of `dist/` created false CI failures. Lesson: verify the generated artifact, not the mirrored root.
- A local JPEG metadata approach using macOS `sips` was not portable to GitHub Actions Ubuntu runners. Lesson: keep build-time asset inspection cross-platform.
- Large Gmail batch trash operations timed out. Lesson: mailbox cleanup should use smaller batches.

## Last Session

- Tightened GitHub monitoring and Slack DM escalation.
- Added site-ops Slack alert script.
- Labeled and cleaned GitHub/site ops mail.
- Shipped lighter homepage and essay social image assets.
- Fixed `seo:audit` to inspect `dist/`.
- Fixed build output to include `CNAME` in `dist/`.
- Polished archive metadata to remove the last SEO warning.

## Next Run

- If visual work resumes, first classify the current uncommitted media churn into:
  - real new source assets worth keeping
  - generated junk and duplicate Finder-style files worth deleting
- If site health breaks again, use `skills/ci-triage.md`.
- If homepage or essay layout changes, run `npm run qa:visual` before push.
- Keep `PROJECT_MEMORY.md` current after any production-impacting fix.
