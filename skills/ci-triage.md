# Skill: CI Triage

## Trigger

- A GitHub Actions run fails
- `Site Ops` opens or updates an alert
- Deploy passes locally but fails remotely

## Procedure

1. Identify the failing workflow and exact run URL.
2. Pull failed logs first, not guesses.
3. Separate:
   - source bug
   - verifier bug
   - environment/secret bug
4. Reproduce locally with the closest command path.
5. Fix the source of truth, not mirrored output.
6. Re-run the exact verifier path locally.
7. Push and watch the new workflow run to completion.
8. Close the operator loop:
   - confirm the alert issue is closed or recovered
   - sweep stale GitHub or site-alert email created during the incident window
9. Write the lesson into `PROJECT_MEMORY.md`.

## Repo-Specific Commands

- `gh run list --repo vikramcars24/vikramcars24.github.io`
- `gh run view <run-id> --log-failed --repo vikramcars24/vikramcars24.github.io`
- `npm run build`
- `npm run seo:audit`
- `npm run publish:root`

## Success Condition

- The replacement run is green
- The open alert issue is closed or not recreated
- Stale GitHub or site-alert mail from the same incident window has been cleared
