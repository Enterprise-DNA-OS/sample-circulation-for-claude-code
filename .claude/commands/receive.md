---
description: Record all or selected returned items and their condition.
---

Read CLAUDE.md. Record all or selected returned items and their condition.

Run `node scripts/samples.mjs receive <loan> [--sample=SAMPLE] --condition=good|damaged --location=TEXT --actor=NAME` with the operator's actual values. Add --json when structured output is useful. Run help if syntax is unclear.

Read the affected records first. Use only the operator's authorised change and named actor. If the name is ambiguous, show candidates before proceeding. Do not invent a handover, return, physical observation or evidence reference.

Confirm which individual pieces actually came back. Omit --sample only when all outstanding pieces returned with the same condition and location. Missing pieces remain outstanding.

Never send messages, publish reports or delete history.
