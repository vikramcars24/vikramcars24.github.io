---
name: cars24-maker-agent
description: Use when creating Cars24 content in the Maker workflow: write-up only, write-up plus image, or image only. Mirrors the Maker Agent flow from the Claude Code setup, including onboarding, freeze gates, and the image-generation pipeline.
---

# Cars24 Maker Agent

This is the Codex-side wrapper for the Maker Agent that already exists in the Claude setup at:

- `/Users/vikram/Desktop/maker-agent-v1/2_Agents/2_Codex Agents/maker-agent.md`
- `/Users/vikram/Desktop/maker-agent-v1/3_Skills/2_Codex Skills/maker-skill.md`

## When to use

Use this skill when the user wants Cars24 creative work in any of these forms:

- write-up only
- write-up + image
- image only from existing copy

## Load order

Read these source files in order:

1. `/Users/vikram/Desktop/maker-agent-v1/3_Skills/2_Codex Skills/maker-skill.md`
2. `/Users/vikram/Desktop/maker-agent-v1/2_Agents/2_Codex Agents/maker-agent.md`
3. `/Users/vikram/Desktop/maker-agent-v1/3_Skills/2_Codex Skills/founder-voice-skill.md` when founder-led copy is needed
4. `/Users/vikram/Desktop/maker-agent-v1/3_Skills/2_Codex Skills/creative-direction.md` before any image brief or visual output

## Core behavior

- Follow the 3-path Maker onboarding and routing flow from the source files.
- Respect copy freeze gates before any image work.
- Respect slide freeze and approval gates before any Higgsfield-style generation planning.
- Keep Cars24 as the brand frame unless the user explicitly wants founder-personal writing.
- Treat the source files above as the operative rules; this skill is the trigger and router.

## Notes

- Do not rewrite or paraphrase the Maker system from memory when the source files can be read directly.
- If the source files are moved or unavailable, say so briefly and continue with the closest faithful fallback.
