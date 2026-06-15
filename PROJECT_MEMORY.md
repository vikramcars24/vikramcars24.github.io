# Project Memory

## Verified Facts

- The production site is built from source into `dist/` by `scripts/build.mjs`.
- Root files such as `index.html` and `archive/index.html` are publish mirrors, not the primary source of truth.
- `npm run publish:root` is the required publish path for website-output changes.
- `npm run seo:audit` now audits generated `dist/` output, which matches the GitHub Actions deploy artifact.
- `Site Ops` GitHub Action is currently green after the audit/build-path fixes.
- The site has automated GitHub issue + Slack DM alerting for site-ops failures.
- The repo now has a dedicated `Morning Ops Sweep` workflow that checks GitHub workflow state, open alert issues, and GitHub/site email cleanup on a schedule and after key workflow completions.
- `qa-screens/` is intentionally gitignored; screenshot verification is mandatory for layout changes.
- GitHub/site email must be treated as a first-class ops queue, not a secondary notification surface.

## Failed Attempts And Lessons

- Auditing root output instead of `dist/` created false CI failures. Lesson: verify the generated artifact, not the mirrored root.
- A local JPEG metadata approach using macOS `sips` was not portable to GitHub Actions Ubuntu runners. Lesson: keep build-time asset inspection cross-platform.
- Large Gmail batch trash operations timed out. Lesson: mailbox cleanup should use smaller batches.
- Incident closure was defined too narrowly as "GitHub runs are green." Real RCA: the workflow lacked an explicit post-recovery inbox sweep, so stale GitHub failure mail remained even after deploy and `Site Ops` were healthy. Lesson: an incident is not closed until runtime is green, the alert issue is closed, stale alert mail from the fix window is cleared, and the lesson is written back to memory.
- Email triage was handled reactively instead of as a standing queue. Lesson: use a written morning ops sweep and severity labels so GitHub/site mail is reviewed proactively.
- GitHub Actions failure mail in this inbox comes from `notifications@github.com`, not just `noreply@github.com`. Lesson: any Gmail cleanup/search automation for GitHub must query both senders or it will miss stale alerts entirely.
- Desktop Lighthouse TBT can spike on single runs even when the site is healthy. Lesson: `Site Ops` should not fail on a one-off desktop sample; use repeated runs and aggregate the volatile metric before opening an incident.
- GitHub Actions is a good health checker but a bad long-term owner of Gmail state because Google runner-side OAuth can degrade with `invalid_rapt`. Lesson: keep alerting in GitHub + Slack, delegate GitHub CI inbox filing to Gmail filters, and keep a local machine-side sweep as the independent fallback operator.
- The Gmail filter has to live on the mailbox that actually receives GitHub CI mail. Lesson: connector auth and local OAuth can silently point at different Google accounts, so verify the active Gmail profile before concluding the filter path is complete.

## Last Session

- Tightened GitHub monitoring and Slack DM escalation.
- Added site-ops Slack alert script.
- Labeled and cleaned GitHub/site ops mail.
- Shipped lighter homepage and essay social image assets.
- Fixed `seo:audit` to inspect `dist/`.
- Fixed build output to include `CNAME` in `dist/`.
- Polished archive metadata to remove the last SEO warning.
- Corrected the incident-close definition to include inbox cleanup after the final green run.
- Added explicit GitHub-email triage and morning ops sweep doctrine.
- Added a real `Morning Ops Sweep` automation path so GitHub/site triage is not purely manual or prompt-driven.
- Switched the hosted morning sweep to filter-managed inbox mode and added a local LaunchAgent sweep on the Mac as a second control plane.
- Upgraded the local Gmail OAuth token for `vikram@cars24.com` to include `gmail.settings.basic`, created the `Ops/GitHub/CI` label and auto-archive filter for GitHub CI mail, and marked the lingering unread Site Ops failure mail as read.

## Next Run

- If visual work resumes, first classify the current uncommitted media churn into:
  - real new source assets worth keeping
  - generated junk and duplicate Finder-style files worth deleting
- If site health breaks again, use `skills/ci-triage.md`.
- If fresh GitHub/site mail appears, use `skills/github-email-triage.md`.
- For routine operational hygiene, use `skills/morning-ops-sweep.md`.
- If Gmail cleanup falls back to skipped inside automation, the blocker is credential scope, not missing sweep logic.
- The repo-side default is now `GMAIL_SWEEP_MODE=filter`; runner auth should not be relied on for Gmail mutation.
- The live Gmail filter query for GitHub CI mail is `(from:notifications@github.com OR from:noreply@github.com) cc:ci_activity@noreply.github.com "vikramcars24.github.io"`.
- If homepage or essay layout changes, run `npm run qa:visual` before push.
- Keep `PROJECT_MEMORY.md` current after any production-impacting fix.
- For any GitHub/site incident, treat the mandatory closure checklist as:
  - fix the underlying issue
  - verify the replacement deploy or workflow run is green
  - verify any open alert issue is closed
  - clear stale GitHub or site-alert email generated during the incident window
  - write the lesson back into memory
