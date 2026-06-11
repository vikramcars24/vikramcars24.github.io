# Skill: Deploy Check

## Trigger

- A production-impacting push lands on `main`
- A deploy finishes and needs validation

## Procedure

1. Confirm local verifier path first:
   - `npm run publish:root`
   - `npm run seo:audit`
2. Push.
3. Watch:
   - `Deploy Site`
   - `Site Ops`
4. Verify the public URL when needed.
5. Confirm there is no open `site-ops` issue.
6. Write any lesson back into `PROJECT_MEMORY.md`.

## GitHub Commands

- `gh run list --repo vikramcars24/vikramcars24.github.io --workflow 'Deploy Site'`
- `gh run list --repo vikramcars24/vikramcars24.github.io --workflow 'Site Ops'`
- `gh issue list --repo vikramcars24/vikramcars24.github.io --state open --label site-ops`
