---
description: Record a physical observation and reconcile an inventory hold.
---

Read CLAUDE.md. Record a physical observation and reconcile an inventory hold.

Run `node scripts/samples.mjs stocktake <sample> --condition=good|damaged|missing --location=TEXT --note=TEXT --actor=NAME` with the operator's actual values. Add --json when structured output is useful. Run help if syntax is unclear.

Read the affected records first. Use only the operator's authorised change and named actor. If the name is ambiguous, show candidates before proceeding. Do not invent a handover, return, physical observation or evidence reference.

A count is a physical observation, never an assumption from an export. Do not release an imported hold until outstanding loans have been reconciled.

Never send messages, publish reports or delete history.
