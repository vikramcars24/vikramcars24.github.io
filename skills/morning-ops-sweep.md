# Skill: Morning Ops Sweep

## Trigger

- Daily website operations
- Start of a working day
- After a burst of deploys or incident response
- The scheduled GitHub Actions workflow `Morning Ops Sweep`
- Completion of `Deploy Site`, `Site Ops`, `Audience Dashboard`, or `Monthly Site Report`

## Sweep Order

1. Gmail:
   - search fresh GitHub/site mail
   - classify into security, CI, site, or resolved noise
2. GitHub Actions:
   - check latest `Deploy Site`
   - check latest `Site Ops`
   - check latest dashboard/reporting workflows
3. GitHub Issues:
   - review open `site-ops`
   - review open `audience-dashboard`
   - review any other alert labels
4. Cleanup:
   - clear stale resolved email
   - ensure open issues correspond to real unresolved incidents
5. Memory:
   - if a new failure mode appeared, write it into `PROJECT_MEMORY.md`

## Automation Note

The repo now has a real automation path for this sweep. Use the manual checklist when investigating or extending it, not as a substitute for the workflow itself.

## Rule

Do not let the inbox, Actions page, and issue tracker drift into three different truths.
