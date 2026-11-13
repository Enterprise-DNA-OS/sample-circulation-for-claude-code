# Sample Circulation for Claude Code

For the person managing a brand or agency's physical press samples. Set the business name in brand.json. The demo records are fictional.

## Operating rules

Read the database before answering. Use node scripts/samples.mjs help for syntax. Never invent a physical count, handover, return, agreement, recipient or source document. A sample is one physical piece with one barcode.

Mutations require a named --actor from the operator. That is attribution, not authentication. Before shared use, configure authenticated access, private database hosting and backups. The owner connection bypasses row security. Never expose it to a browser.

Every write must be within the operator's request. Read /card before changing custody. A return records what physically came back, not what was due. Never clear a reconciliation hold just because an export calls the piece available. Reconcile open loans first.

Never send messages, publish reports, fetch source URLs automatically, process payments or delete history. Drafts stay local. Retire a sample rather than deleting it. Privacy retention changes need a reviewed, explicitly authorised migration covering historical copies as well as current contacts.

Read docs/compliance.md for the cited rules and local policy thresholds. Missing evidence is not a legal verdict. The desk does not certify compliance, calculate customs charges, or recreate media ratings.

## Routing

- /inventory: List each physical sample and its recorded custody.
- /contacts: Read recipients and their privacy review records.
- /loans: Read reservations and dispatched loans.
- /card: Read one sample and its complete loan, stocktake and note history.
- /returns-due: Prepare the daily sample callback list.
- /pull-list: Prepare this week's reserved samples and check readiness.
- /reservations: Review the forward reservation book.
- /attention: Triage late returns, missed dispatches, holds and stale stocktakes.
- /stocktake-due: Plan a physical count of samples recorded at home.
- /idle-samples: Find pieces unused for sixty days.
- /utilisation: Review how often each individual sample has circulated.
- /recipient-history: Review outstanding items, late returns and damage by recipient.
- /collection-review: Prepare the end-of-season collection review.
- /compliance: Review privacy evidence and custody terms against cited rules.
- /audit: Read recorded operators and recent changes.
- /weekly-review: Prepare Monday's review from returns, pulls, stocktakes and holds.
- /add: Register a sample or recipient.
- /set-contact: Update the stated purpose and privacy review evidence.
- /reserve: Reserve a physical sample for a recipient and date range.
- /add-item: Add another sample to a reserved loan.
- /record-loss: Record an authorised loss with supporting evidence without inventing a return.
- /dispatch: Record a physical handover after all readiness checks pass.
- /receive: Record all or selected returned items and their condition.
- /cancel: Cancel an undispatched reservation.
- /stocktake: Record a physical observation and reconcile an inventory hold.
- /set-terms: Record the agreed custody terms before dispatch.
- /retire: Archive or write off a sample that has no active commitments.
- /log: Append a note to the sample history.
- /import: Import mapped Launchmetrics inventory into a reconciliation hold.
- /export: Export every record as a local snapshot and CSV files.
- /draft-callback: Draft a local callback note from outstanding loan items.
- /draft-weekly-review: Write the weekly review to a local draft.
- /customise: Change fields or rules through a tested forward migration.
- /new-view: Add a branded read-only report.

## Locations

scripts/samples.mjs is the one domain CLI. scripts/lib/db.mjs chooses PGlite or DATABASE_URL. supabase/migrations holds forward migrations. docs/replace-launchmetrics-samples.md defines the import contract. README.md holds setup and demonstration questions. AGENTS.md routes other agents here.
