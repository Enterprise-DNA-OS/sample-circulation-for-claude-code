---
description: Reserve a physical sample for a recipient and date range.
---

Read CLAUDE.md. Reserve a physical sample for a recipient and date range.

Run `node scripts/samples.mjs reserve <sample> --contact=RECIPIENT --code=CODE --from=YYYY-MM-DD --due=YYYY-MM-DD --purpose=TEXT --terms=REFERENCE --destination=TEXT --actor=NAME` with the operator's actual values. Add --json when structured output is useful. Run help if syntax is unclear.

Read the affected records first. Use only the operator's authorised change and named actor. If the name is ambiguous, show candidates before proceeding. Do not invent a handover, return, physical observation or evidence reference.

Report the result and any remaining hold or deadline.

Never send messages, publish reports or delete history.
