---
description: Import mapped Launchmetrics inventory into a reconciliation hold.
---

Read CLAUDE.md. Import mapped Launchmetrics inventory into a reconciliation hold.

Run `node scripts/samples.mjs import launchmetrics --file=PATH [--map=PATH] --as-of=YYYY-MM-DD --dry-run --actor=NAME` with the operator's actual values. Add --json when structured output is useful. Run help if syntax is unclear.

Read the affected records first. Use only the operator's authorised change and named actor. If the name is ambiguous, show candidates before proceeding. Do not invent a handover, return, physical observation or evidence reference.

Read docs/replace-launchmetrics-samples.md. This is a mapped inventory import, not a complete migration. Check the original headings and counts, run the test import, then remove --dry-run only within the authorised import. New rows stay quarantined until custody is reconciled.

Never send messages, publish reports or delete history.
