# Skill: GitHub Email Triage

## Trigger

- New email from GitHub or GitHub Actions
- Morning ops sweep
- Post-incident cleanup

## Purpose

Treat Gmail as a first-class queue for repo operations, not as a passive notification mirror.

## Severity Buckets

- `Ops/GitHub/Security`
  - permission requests
  - auth changes
  - suspicious access or app-install changes
- `Ops/GitHub/CI`
  - workflow failures
  - deploy failures
  - dashboard/reporting failures
- `Ops/Site`
  - public-site operational issues
  - health alerts
  - metadata/indexing/discoverability incidents
- `Ops/Resolved`
  - stale alerts already fixed and verified

## Procedure

1. Search fresh GitHub/site mail first.
2. Classify each item:
   - security/permissions
   - CI/deploy
   - site health
   - stale resolved noise
3. For actionable mail:
   - open the matching GitHub run, issue, or page
   - diagnose the underlying problem
   - fix it at source if repo-side
4. After the replacement run is green:
   - verify alert issue state
   - trash or relabel stale incident email as resolved
5. Update `PROJECT_MEMORY.md` if the incident taught something new.

## Success Condition

- No fresh untriaged GitHub/site email remains in the active bucket
- Any stale resolved alert has been cleared
- Underlying repo-side problem is either fixed or explicitly classified as external
