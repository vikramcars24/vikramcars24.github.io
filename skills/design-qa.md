# Skill: Design QA

## Trigger

- Any visual or layout change
- Thumbnail, hero, archive row, article-body, or mobile spacing change

## Procedure

1. Build the site.
2. Run `npm run qa:visual`.
3. Review all six screenshots:
   - `/` at `390x844`
   - `/archive/` at `390x844`
   - `/posts/why-we-are-not-selling-cars/` at `390x844`
   - `/` at `1280x900`
   - `/archive/` at `1280x900`
   - `/posts/why-we-are-not-selling-cars/` at `1280x900`
4. Check for:
   - text wrapping issues
   - thumbnail overflow
   - article-body width regressions
   - dead click zones
   - Safari-sensitive row layout issues
5. Only then push.

## Rule

Text logs are not enough for UI work in this repo.
