# Bring your Launchmetrics sample inventory across

The importer accepts a CSV inventory export, with an explicit mapping when the headings differ. It does not assume a universal Launchmetrics export layout. Public export headings could not be verified during this build. The included fixture is a synthetic mapping example, not a vendor-produced export.

1. Use your account's inventory/report export or ask your Launchmetrics administrator for the inventory spreadsheet. Export all departments and include a stable barcode, description, style, brand, season, colour, size and recorded location. Keep the original export, loan reports, attachments and record counts. Launchmetrics documents these inventory attributes in its [sample tracking guide](https://www.launchmetrics.com/resources/blog/sample-tracking-software); it does not specify a standard public export contract there.
2. If the result is Excel, save the inventory sheet as UTF-8 CSV. Preserve barcodes as text, including leading zeros. Do not use a report that groups several physical pieces into one row.
3. The default, local interchange headings are Barcode, Description, Style Number, Brand, Season, Color, Size, Location. For different headings, write a mapping such as the following. Only barcode and name are required mappings; all mapped columns must exist.

```json
{"barcode":"Your Barcode Column","name":"Your Description Column","season":"Your Season Column"}
```

4. Import with one command, first as a test run:

```bash
node scripts/samples.mjs import launchmetrics --file=imports/inventory.csv --map=imports/mapping.json --as-of=2026-11-13 --dry-run --actor="Your name"
```

Use the actual export date. Remove --map if the default headings match. Review the result, then remove --dry-run. The test run rolls back both records and audit entries. Reimporting the same row does nothing; changed existing rows stop the whole file so custody is never silently overwritten. Unmapped columns are preserved in source_data for reconciliation.

5. Compare imported and unchanged counts to the export. Read /inventory and /card. New pieces enter quarantine. Reconcile the original loan report against actual custody before releasing each item. For a piece physically present, use /stocktake. For an already dispatched piece, keep it held until its return is physically checked, or ask /customise for a reviewed historical-loan migration. Do not create a fictional present-day dispatch to represent history.
6. Work through open reservations, outstanding loans, original agreements and photographs separately. They are not inferred from the inventory export. Media coverage, proprietary Media Impact Value, RFID readings, tracking integrations and digital showroom requests do not move through this importer. Enterprise DNA can map available exports and add the connections your version needs.
7. Run both records in parallel until sample counts, physical locations and every outstanding loan agree. A clean inventory can move in a day; the time needed to reconcile loan history depends on the records. Keep the previous service until those checks pass.

Export your owned records with `node scripts/samples.mjs export --out=exports/backup-2026-11-13`. The parent folder must already exist and the output folder must be new. The snapshot includes all seven domain record sets, including audit history. CSV preserves exact text: import spreadsheet columns as text to avoid interpreting formula-like content. The JSON snapshot is the canonical backup. Restoring it requires a reviewed database restore/migration; this inventory importer is not a whole-system restore command.
