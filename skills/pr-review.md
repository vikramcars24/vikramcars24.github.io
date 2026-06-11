# Skill: PR Review

## Trigger

- Reviewing a proposed code or content change before merge/push

## Procedure

1. Start with findings, not summary.
2. Check for source-of-truth drift:
   - source vs generated output
   - metadata vs rendered page
   - image path vs actual asset
3. Check operational regressions:
   - SEO tags
   - redirects
   - JSON-LD
   - broken workflow assumptions
4. Check whether verification matches the actual artifact.
5. If no findings, state that explicitly and note residual risk.

## This Repo’s Frequent Failure Modes

- Editing root HTML instead of source
- Updating metadata without shipping the matching asset
- Passing local checks against the wrong output path
- Visual regressions not caught because screenshots were skipped
