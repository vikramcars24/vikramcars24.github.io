---
name: cars24-creative-direction
description: Use before generating any Cars24 image brief, creative concept, or visual direction. Loads the established creative-direction system from the Claude Code Maker setup, including themes, layouts, typography, and logo rules.
---

# Cars24 Creative Direction

This skill points to the established creative-direction source of truth in the Maker bundle:

- Primary source: `/Users/vikram/Desktop/maker-agent-v1/1_References/CREATIVE-DIRECTION.md`
- Codex mirror: `/Users/vikram/Desktop/maker-agent-v1/3_Skills/2_Codex Skills/creative-direction.md`

## When to use

Use this before:

- creating a visual concept
- drafting an image-generation brief
- making a carousel plan
- choosing dark/light theme
- deciding hero, pattern, logo, or typography treatment

## What to load

Start with:

1. `/Users/vikram/Desktop/maker-agent-v1/1_References/CREATIVE-DIRECTION.md`

Then load only the specific supporting references you need from the same bundle, such as:

- `1_References/REFERENCE-ATLAS.md`
- `1_References/1_Brand Guidelines/.../notes.md`
- `1_References/3_Illustrations References/...`
- `1_References/5_Photography References/...`

## Rules

- Reference creatives are the ground truth; brand guidelines fill gaps.
- Do not approximate the logo, theme behavior, type system, or layout archetypes from memory.
- Keep the theme system and layout archetypes faithful to the source bundle.
- For image-model prompts, describe typography visually, not just by font name.
