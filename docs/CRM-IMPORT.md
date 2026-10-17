# Offline CRM export validation

The public Growth MCP remains fixed to synthetic data. This operator tool prepares a minimal, validated local dataset; it does not upload, publish, replace the demo export or connect a real CRM.

## Try with the synthetic export

```sh
node services/growth-kpi/import-export.mjs services/growth-kpi/data services/growth-kpi/import-mapping.example.json
```

To write a normalized bundle, add a NEW output directory outside the source repository. Existing directories are never overwritten. Output files use owner-only permissions. Keep real exports and staged bundles out of Git and public Cloud Build inputs.

## Map an approved export

Copy the example mapping and set `synthetic` to false for actual CRM data. Each destination column names an explicit source header. This does not assume one universal Raiser’s Edge CSV layout. Source files must be CSV with one header row; IDs are strings, dates ISO `YYYY-MM-DD`, and amounts non-negative fixed two-decimal values. Locale-specific dates/amounts must be converted deliberately before validation.

Required normalized inputs:

- Constituents: stable system ID and record-created date. Names, emails and other unused columns are discarded.
- Gifts: stable gift ID, direct donor system ID, gift date, gift type, amount, currency.
- Payment events: stable event ID, gift ID, event date, outcome and amount. A pledge/gift amount does not prove a receipt; provide an approved received/refunded/voided ledger or reconciliation supplement.
- Merge aliases: alias and canonical donor IDs. An empty header-only file is allowed only when no merges apply.

Coverage requires a named operator and evidence reference affirming complete lifetime donation history through the export date. The software checks declared boundaries and relationships; it **cannot independently prove historical completeness**. An annual export alone is insufficient for first-ever donors. Accepted profiles retain that assertion in their manifest and show it as operator-attested.

Unknown gift-type labels are rejected for explicit reconciliation. Receipt-eligible types are Cash, Pay-Cash, MG Pay-Cash and Recurring Gift Pay-Cash. Recognized nonqualifying types are Recurring Gift, Pledge, MG Pledge, Stock, Gift-in-Kind and Other.

Validation rejects absent mappings, missing receipt data, mixed currencies, ambiguous IDs, invalid dates/amounts, impossible refunds, merge cycles and references outside supplied tables. Reads are bounded to 25 MiB / 100,000 records per CSV and to files inside the selected directory. Source and output hashes are recorded. Larger datasets need a streaming/warehouse import path; this tool makes no large-volume throughput claim.

## Remaining production gate

A staged bundle is not authorization to serve real data. The deployed package still rejects non-synthetic classification. Production must add the approved data source, organization/dataset authorization, data retention, monitoring and an authenticated report delivery path. Do not relabel actual data as synthetic or copy it into the public demo. Use the sample fixtures for tests and presentations.
