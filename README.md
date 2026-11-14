# Sample Circulation for Claude Code

Know which piece is with which stylist, when it is due back, and which next shoot depends on its return. A physical sample desk for fashion, lifestyle and beauty brands and PR agencies. Free software under the MIT licence, built by Enterprise DNA for Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Install the free desk below. | Your collection names, loan rules and Launchmetrics export mapping. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=launchmetrics-samples&utm_medium=readme). | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [See the offer](https://enterprisedna.co/omni/instead-of/launchmetrics-samples?utm_source=github&utm_medium=readme&utm_campaign=launchmetrics-samples). |

This project covers reservations, physical handovers, partial returns, damage, stocktakes and collection reviews. It does not recreate the entire Launchmetrics suite, its media valuation or its monitoring network. [Scope and operating limits](docs/why-no-front-end.md).

Launchmetrics' regional Korea pricing page lists its Essentials package from EUR 1,550 monthly billed annually, or EUR 18,600 over twelve months. That is a package benchmark, not a Samples-only price or an ANZ customer invoice. Global Starter pricing and package scope differ. [Sources and selection](docs/research.md).

## Quick start

Node 20 or 22:

```bash
git clone https://github.com/Enterprise-DNA-OS/sample-circulation-for-claude-code.git
cd sample-circulation-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

Then ask /returns-due or /pull-list. Demo data is fictional: six physical samples, three recipients and four loans, with late returns, a damaged coat and a future pull blocked by an earlier borrower. Dates are relative to the seed date. Running seed again preserves your changes.

The embedded PGlite database lives in .data/db. For shared use, configure DATABASE_URL for a private PostgreSQL database and run npm run migrate. Do not seed the working database. Shared demo seeding requires --demo-database. Access control, backups and restore testing are deployment work; the owner connection bypasses row security and must not be exposed to end users.

## Your first hour: ten things to ask for

1. Which overdue pieces are also needed for next week's shoots? (/returns-due and /pull-list)
2. Which recipients have late returns and damaged pieces in the same history? (/recipient-history)
3. Which pieces have never circulated despite sitting in an active collection? (/idle-samples)
4. Which reservations are now blocked by a condition or inventory hold? (/reservations)
5. Which samples are at home but have not been physically counted recently? (/stocktake-due)
6. Which collections have the most held pieces beside their circulation counts? (/collection-review)
7. Which loan has only part of its pieces back, and what is still outstanding? (/card and /returns-due)
8. Which recipient records need their retention and access evidence reviewed? (/compliance)
9. Who last changed a sample's condition and what observation supported it? (/card and /audit)
10. What should Monday's meeting cover across returns, pulls and cupboard counts? (/weekly-review)

Each question is answerable by the shipped commands. These are cross-record questions to adapt to your process, not an unsupported claim that Launchmetrics can never answer them. Ask /customise to add a field or change a local rule, and /new-view to turn an answer into a report.

## Commands

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

All domain actions use `node scripts/samples.mjs`. Use help for syntax and --json for structured results. Names match case-insensitively and identifiers by prefix; ambiguous matches list candidates and exit unsuccessfully. Writes require --actor, which records attribution rather than authenticating the operator.

## Bring your records across

Export the inventory, map its headings, and run the one-command test import. New samples are held for custody reconciliation. The free importer does not reconstruct current or historical loans from inventory status. [Exact mapping and reconciliation](docs/replace-launchmetrics-samples.md).

## Paperwork and views

Edit brand.json for the business name, colours and logo. The three document types are loan notes, return reconciliations and stocktake records. The three read-only views cover the week, collections and recipient return history. Draft callbacks and weekly reviews stay in drafts/. Nothing sends.

## Rules that preserve the record

Reservations use inclusive calendar dates and cannot overlap for the same piece. Dispatch checks actual availability and agreed terms. Partial returns keep outstanding custody open. Damaged and missing pieces cannot be dispatched. Historical returns, stocktakes and audit entries cannot be rewritten through normal commands. Privacy evidence checks cite NZ principles 5 and 9 and Australian APP 11. [What the checks mean](docs/compliance.md).

## Validation

`npm test` uses a temporary database and exercises every domain command, overlap and handover rules, partial returns, import rollback and reconciliation, immutable history, JSON output, HTML escaping and report generation. CI runs Node 20 and 22 on Windows and Linux, plus PostgreSQL 16. Demo and tests make no vendor API, mail or carrier calls.

## Licence

MIT. Copyright 2026 Enterprise DNA. Independent software, not affiliated with or endorsed by Launchmetrics. Hosting, agent subscriptions and managed service work have their own costs.
