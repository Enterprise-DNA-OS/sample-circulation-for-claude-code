---
description: Record a physical handover after all readiness checks pass.
---

Read CLAUDE.md. Record a physical handover after all readiness checks pass.

Run `node scripts/samples.mjs dispatch <loan> --shipping=REFERENCE --actor=NAME` with the operator's actual values. Add --json when structured output is useful. Run help if syntax is unclear.

Read the affected records first. Use only the operator's authorised change and named actor. If the name is ambiguous, show candidates before proceeding. Do not invent a handover, return, physical observation or evidence reference.

Confirm the physical handover happened. Terms, destination, shipping reference, inventory condition and current custody are checked before dispatch.

Never send messages, publish reports or delete history.
